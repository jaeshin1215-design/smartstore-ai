// 쿠팡 Wing API — IP 등록 완료 후 실행할 테스트 시퀀스
//
// ⚠️ 실행 조건: 이다슬 프로가 쿠팡 화이트리스트에 79.127.159.105 등록 확인 후에만.
//    실수 방지를 위해 --go 플래그 없이는 아무 호출도 하지 않는다.
//
// 실행: node scripts/coupang-test-sequence.mjs --go
//
// 시퀀스:
//   ① /ordersheets 재호출        → 403 해소 확인 (IP 등록 검증)
//   ② 상품 목록 페이징 조회       → seller-products 라우트 (로켓그로스 스키마 우선)
//   ③ 목록 첫 sellerProductId 단건 조회 → 응답 스키마 판별
//   ④ 스키마 종류 = 판매방식의 물적 증거 (rocketGrowth vs legacy)
//   ⑤ 관제탑 기록용 결과 요약 출력
//
// 결과 기록 항목: 스키마 종류 / salePrice 필드 확보 여부 / 404 재현 여부

import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 실행 가드 ──────────────────────────────────────────────
if (!process.argv.includes("--go")) {
  console.log("⛔ 라이브 호출 가드: 이다슬 프로의 IP 등록(79.127.159.105) 확인 전에는 실행 금지.");
  console.log("   등록 확인 후: node scripts/coupang-test-sequence.mjs --go");
  process.exit(0);
}

// ── .env.local 로드 ────────────────────────────────────────
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/\\\$/g, "$");
}

const ACCESS_KEY = env.COUPANG_ACCESS_KEY;
const SECRET_KEY = env.COUPANG_SECRET_KEY;
const VENDOR_ID = env.COUPANG_VENDOR_ID;
const BASE_URL = env.COUPANG_BASE_URL || "https://api-gateway.coupang.com";
const PROXY_SECRET = env.SELLFIT_PROXY_SECRET;

if (!ACCESS_KEY || !SECRET_KEY || !VENDOR_ID) {
  console.error("환경변수 누락: COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY / COUPANG_VENDOR_ID");
  process.exit(1);
}

// ── HMAC 서명 (확정 규격: 대문자 method + 슬래시포함 path + 2자리 연도 datetime) ──
function toDatetimeStr(date) {
  const iso = date.toISOString();
  return iso.substring(2, 4) + iso.substring(5, 7) + iso.substring(8, 10)
    + "T" + iso.substring(11, 13) + iso.substring(14, 16) + iso.substring(17, 19) + "Z";
}

async function wingGet(path, query = "") {
  const datetime = toDatetimeStr(new Date());
  const message = datetime + "GET" + path + query;
  const signature = createHmac("sha256", SECRET_KEY).update(message).digest("hex");
  const authorization = `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
  const url = `${BASE_URL}${path}${query ? `?${query}` : ""}`;
  const headers = {
    Authorization: authorization,
    "Content-Type": "application/json;charset=UTF-8",
    "X-Requested-By": VENDOR_ID,
  };
  if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

// ── 스키마 판별 (lib/coupang/client.ts parseSellerProduct와 동일 기준) ──
function detectSchema(detail) {
  const items = detail?.data?.items ?? [];
  if (items.length === 0) return "unknown(items 없음)";
  const dual = items.every(
    (it) =>
      Object.prototype.hasOwnProperty.call(it, "rocketGrowthItemData") ||
      Object.prototype.hasOwnProperty.call(it, "marketplaceItemData")
  );
  return dual ? "rocketGrowth(신규 스키마)" : "legacy(기존 스키마)";
}

function extractSalePrices(detail) {
  const items = detail?.data?.items ?? [];
  const prices = [];
  for (const it of items) {
    if (it.rocketGrowthItemData?.priceData) prices.push({ channel: "ROCKET_GROWTH", ...it.rocketGrowthItemData.priceData });
    if (it.marketplaceItemData?.priceData) prices.push({ channel: "MARKETPLACE", ...it.marketplaceItemData.priceData });
    if (typeof it.salePrice === "number") prices.push({ channel: "MARKETPLACE(legacy)", originalPrice: it.originalPrice, salePrice: it.salePrice });
  }
  return prices;
}

// ── 시퀀스 실행 ────────────────────────────────────────────
const report = { timestamp: new Date().toISOString(), steps: {} };

console.log("━━━ ① 주문 조회 /ordersheets — 403 해소 확인 ━━━");
{
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${VENDOR_ID}/ordersheets`;
  const query = `createdAtFrom=${fmt(from)}&createdAtTo=${fmt(now)}&maxPerPage=5`;
  const r = await wingGet(path, query);
  console.log("HTTP", r.status, JSON.stringify(r.body).substring(0, 200));
  report.steps.ordersheets = { status: r.status, ipResolved: r.status !== 403 };
  if (r.status === 403) {
    console.log("\n⛔ 여전히 403 — IP 등록이 아직 반영되지 않음. 시퀀스 중단.");
    process.exit(1);
  }
}

console.log("\n━━━ ② 상품 목록 페이징 조회 (seller-products) ━━━");
let firstProductId = null;
{
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`;
  const query = `vendorId=${VENDOR_ID}&maxPerPage=10`;
  const r = await wingGet(path, query);
  console.log("HTTP", r.status);
  const list = r.body?.data ?? [];
  console.log("상품 수:", list.length, "/ nextToken:", JSON.stringify(r.body?.nextToken ?? null));
  for (const p of list.slice(0, 10)) {
    console.log(` - [${p.sellerProductId}] ${p.sellerProductName} (${p.statusName})`);
  }
  firstProductId = list[0]?.sellerProductId ?? null;
  report.steps.productList = { status: r.status, count: list.length, reproduced404: r.status === 404 };
}

console.log("\n━━━ ③④ 단건 조회 → 스키마 판별 (판매방식의 물적 증거) ━━━");
{
  if (!firstProductId) {
    console.log("sellerProductId 없음 — 목록이 비었거나 ②가 실패. 단건 조회 생략.");
    report.steps.productDetail = { skipped: true };
  } else {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${firstProductId}`;
    const r = await wingGet(path);
    console.log("HTTP", r.status);
    const schema = detectSchema(r.body);
    const prices = extractSalePrices(r.body);
    console.log("스키마:", schema);
    console.log("가격 필드:", JSON.stringify(prices));
    report.steps.productDetail = {
      status: r.status,
      sellerProductId: firstProductId,
      schema,
      salePriceAvailable: prices.length > 0,
      prices,
    };
  }
}

console.log("\n━━━ ⑤ 관제탑 기록용 요약 ━━━");
console.log(`
| 항목 | 결과 |
|------|------|
| ① IP 차단(403) 해소 | ${report.steps.ordersheets?.ipResolved ? "✅ 해소" : "❌ 미해소"} (HTTP ${report.steps.ordersheets?.status}) |
| ② 상품 목록 조회 | HTTP ${report.steps.productList?.status} / ${report.steps.productList?.count ?? "-"}건 |
| ②' 이전 404 재현 여부 | ${report.steps.productList?.reproduced404 ? "재현됨 (경로 문제 아님 → 추가 조사)" : "재현 안 됨 (seller_api 경로가 정답)"} |
| ③ 단건 조회 스키마 | ${report.steps.productDetail?.schema ?? "생략"} |
| ④ 판매방식 물적 증거 | ${report.steps.productDetail?.schema?.startsWith("rocketGrowth") ? "로켓그로스 또는 동시운영" : report.steps.productDetail?.schema?.startsWith("legacy") ? "판매자배송 전용" : "판별 불가"} |
| salePrice 확보 | ${report.steps.productDetail?.salePriceAvailable ? "✅" : "❌"} |
`);
console.log("raw report:", JSON.stringify(report, null, 2));
