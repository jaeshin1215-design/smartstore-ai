// 매출집계 + CS 파일 → sellfit_customer_orders 시딩
// 실행: node scratch/seed_customer_orders.mjs [CS_FILE_PATH]
//
// 고객 식별 규칙:
//   - customer_name : 수취인 이름 평문 저장
//   - customer_id   : hash(이름+전화번호) — 전화번호 없으면 hash(이름)
//   - phone_masked  : 앞 3자리만 + "..." (예: 010...)
//   - address_masked: 시/구까지만 + "..." (예: 서울 강남구...)
//   - 동명이인 방지 : 주문번호로 CS 파일과 교차 매칭 (1차), 이름으로 매칭 시 경고

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
import { createHash, randomUUID } from "crypto";

const XLSX = createRequire(import.meta.url)("xlsx");

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env.local"), "utf8").split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
const STORE_ID = "984f8d32-6d13-402a-b251-9bedaf0b1f6a";

// ── 유틸 ─────────────────────────────────────────────────────
const hash16 = (raw) => createHash("sha256").update(raw).digest("hex").slice(0, 16);

// 전화번호 마스킹: "01012345678" → "010..."
const maskPhone = (phone) => {
  const p = String(phone).replace(/[^0-9]/g, "");
  if (!p) return null;
  return p.slice(0, 3) + "...";
};

// 주소 마스킹: "서울특별시 강남구 역삼동 123-4" → "서울 강남구..."
const maskAddress = (addr) => {
  const a = String(addr || "").trim();
  if (!a) return null;
  // 시/도 줄임: 서울특별시→서울, 경기도→경기 등
  const normalized = a
    .replace("특별시", "").replace("광역시", "").replace("특별자치시", "")
    .replace("특별자치도", "").replace("도 ", " ");
  const parts = normalized.split(/\s+/);
  // 앞 2토큰(시+구/군)까지만
  return parts.slice(0, 2).join(" ") + "...";
};

// ── CS 파일 로드 (전화번호 제공 시) ──────────────────────────
// CS 파일 컬럼 규칙:
//   반드시 포함: 수취인(이름)
//   있으면 활용: 쇼핑몰주문번호, 주문번호, 전화번호, 수취인전화번호, 주소, 배송지
function loadCsFile(csPath) {
  // order_no(원문) → { phone, address }
  const byOrderNo = new Map();
  // name → [{ phone, address }] (동명이인 감지용)
  const byName = new Map();

  try {
    const wb = XLSX.readFile(csPath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    if (rows.length === 0) { console.log(`[CS] ${csPath}: 빈 파일 — 전화번호 매칭 건너뜀`); return { byOrderNo, byName }; }

    const cols = Object.keys(rows[0]);
    const colOrderNo = cols.find(c => /주문번호/.test(c)) ?? null;
    const colPhone   = cols.find(c => /전화번호|핸드폰/.test(c)) ?? null;
    const colAddr    = cols.find(c => /주소|배송지/.test(c)) ?? null;
    const colName    = cols.find(c => /수취인/.test(c)) ?? null;

    console.log(`[CS] 컬럼 매핑 — 주문번호:${colOrderNo}  전화:${colPhone}  주소:${colAddr}  이름:${colName}`);

    for (const r of rows) {
      const name    = String(r[colName] || "").trim();
      const phone   = colPhone  ? String(r[colPhone] || "").trim() : "";
      const addr    = colAddr   ? String(r[colAddr]  || "").trim() : "";
      const orderNo = colOrderNo ? String(r[colOrderNo] || "").trim() : "";

      const entry = { phone, address: addr };

      if (orderNo) byOrderNo.set(orderNo, entry);

      if (name) {
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(entry);
      }
    }
    console.log(`[CS] 로드 완료 — 주문번호 키 ${byOrderNo.size}건, 이름 키 ${byName.size}명`);
  } catch (e) {
    console.log(`[CS] 파일 읽기 실패: ${e.message} — 전화번호 없이 진행`);
  }

  return { byOrderNo, byName };
}

// ── 메인 ─────────────────────────────────────────────────────
async function run() {
  const csPath = process.argv[2] ?? null;
  const { byOrderNo, byName } = csPath ? loadCsFile(csPath) : { byOrderNo: new Map(), byName: new Map() };

  console.log("── 기존 customer_orders 삭제 ──");
  await db.execute({ sql: "DELETE FROM sellfit_customer_orders WHERE store_id = ?", args: [STORE_ID] });

  const wb = XLSX.readFile("C:/Users/USER/Desktop/0701/영업, 마켓팅-이다슬 프로/영업-매출집계 파일예시_이지스토리.xlsx");
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

  let inserted = 0;
  let csMatched = 0;
  let nameDupWarnings = 0;

  for (const r of rows) {
    const name         = String(r["수취인"] || "").trim();
    const orderNoRaw   = String(r["쇼핑몰주문번호"] || "").trim();
    if (!name || !orderNoRaw) continue;

    // ── CS 파일 교차 매칭 ──────────────────────────────────
    // 1차: 주문번호로 정확 매칭
    let csEntry = byOrderNo.get(orderNoRaw) ?? null;

    // 2차: 이름으로 매칭 (주문번호 미매칭 시 폴백)
    if (!csEntry && byName.has(name)) {
      const nameMatches = byName.get(name);
      if (nameMatches.length === 1) {
        csEntry = nameMatches[0]; // 이름 유일 → 안전 매칭
      } else {
        // 동명이인: 매칭 포기, 경고만
        nameDupWarnings++;
        console.warn(`[경고] 동명이인 — "${name}" CS에 ${nameMatches.length}건. 전화번호 매칭 건너뜀.`);
      }
    }

    if (csEntry) csMatched++;

    const phone   = csEntry?.phone ?? "";
    const address = csEntry?.address ?? "";

    // ── customer_id: 전화번호 있으면 이름+전화 해시, 없으면 이름만 ──
    const idKey       = phone ? `${name}__${phone}` : name;
    const customer_id = hash16(idKey);
    const order_no    = hash16(orderNoRaw);

    const product_name = String(r["상품명"] || "").trim();
    const channel      = String(r["쇼핑몰"] || "").trim();
    const quantity     = Number(r["수량"]) || 1;
    const amount       = Number(r["판매가"]) || 0;
    const order_date   = String(r["주문일자"] || "").slice(0, 10);

    await db.execute({
      sql: `INSERT INTO sellfit_customer_orders
            (id, store_id, customer_id, customer_name, phone_masked, address_masked,
             product_name, order_no, channel, quantity, amount, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(), STORE_ID, customer_id,
        name,
        maskPhone(phone),
        maskAddress(address),
        product_name, order_no, channel, quantity, amount, order_date,
      ],
    });
    inserted++;
  }

  const check = await db.execute({
    sql: "SELECT COUNT(DISTINCT customer_id) as c FROM sellfit_customer_orders WHERE store_id = ?",
    args: [STORE_ID],
  });

  console.log(`\n── 완료 ──`);
  console.log(`삽입: ${inserted}건`);
  console.log(`고유 고객: ${check.rows[0].c}명`);
  console.log(`CS 매칭: ${csMatched}건 / ${inserted}건`);
  if (nameDupWarnings) console.warn(`동명이인 경고: ${nameDupWarnings}건 (전화번호 미매칭)`);
  if (!csPath) console.log(`\n[참고] CS 파일 없이 실행됨 — 전화번호/주소 없음. CS 파일 있으면:\n  node scratch/seed_customer_orders.mjs "CS파일경로.xlsx"`);
}

run().catch(console.error);
