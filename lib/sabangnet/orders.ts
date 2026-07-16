// 사방넷 주문 목록 조회 — OAuth + GET/JSON-body (프록시 경유)
// 주의: 사방넷 조회 API는 GET에 JSON body를 요구한다 (2026-07-09 실측 확정).
// fetch 표준은 GET body를 금지하므로 node:https로 직접 요청한다.
import { request as httpsRequest } from "node:https";
import { fetchSabangnetToken } from "./auth";

// STEP 0 프로브(2026-07-09)로 실재 확인된 필드
// + RECEIVER_CEL: 2026-07-13 프로브 (심유나 프로 회신 — TEL/CEL 별도 컬럼)
// + CM_EA: 2026-07-14 프로브 (실출고 수량 = ea 값, 심유나 프로 확정). ORD_CNT와 다름(세트 19/50건)
export const ORDER_FIELDS = [
  "SB_ORD_NO", "SHOP_ORD_NO", "ORDER_STATUS", "ORD_CNT", "EA", "CM_EA",
  "CM_PRD_NM", "CM_SKU_NM", "PRD_ABBR", "CT_DELIVERY_COST",
  "RECEIVER_NM", "RECEIVER_TEL", "RECEIVER_CEL", "RECEIVER_ADDR", "RECEIVER_ZIPCODE",
  "DELIVERY_MSG", "WAYBILL_NO", "SHOP_NM", "LOGISTICS_NM",
  "ORDER_DT", "REG_DATE", "SET_DIV_CD",
] as const;

export type SabangnetOrder = Record<(typeof ORDER_FIELDS)[number], string | null>;

function getWithBody(urlStr: string, headers: Record<string, string>, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = httpsRequest(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "GET",
        headers: { ...headers, "content-length": Buffer.byteLength(body) },
      },
      (res) => {
        // Buffer 누적 후 일괄 디코딩 — 청크 분절로 인한 한글 손상 방지
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * 주문 목록 전체 조회 (페이징 자동 순회, 읽기 전용 — updateOrderStsYn=N 고정)
 * @param startDate yyyyMMdd
 * @param endDate   yyyyMMdd
 * @param orderStatusList 주문상태 필터(배열). 예: ["ORDER_CONFIRM"]=미발주(송장없음)만.
 *        생략 시 전체 상태. 2026-07-14 프로브로 배열형만 유효 확인(문자열은 400).
 */
export async function fetchSabangnetOrders(startDate: string, endDate: string, orderStatusList?: string[]): Promise<SabangnetOrder[]> {
  const base = process.env.SABANGNET_BASE_URL; // https://sellfit-proxy.fly.dev/sabangnet
  const acntId = process.env.SABANGNET_ACNT_ID; // 서비스코드 (mw65175)
  const proxySecret = process.env.SELLFIT_PROXY_SECRET;
  if (!base || !acntId) throw new Error("SABANGNET_BASE_URL / SABANGNET_ACNT_ID 미설정");

  const token = await fetchSabangnetToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Svc-Acnt-Id": acntId,
    "Content-Type": "application/json",
  };
  if (proxySecret) headers["x-proxy-secret"] = proxySecret;

  const all: SabangnetOrder[] = [];
  let page = 1;
  while (true) {
    const body = JSON.stringify({
      startDate, endDate,
      // 배송희망일 기준 (2026-07-16 심유나 프로 실측 대조로 확정 — 이전 "주문일 기준" 주석은 오류)
      //   근거: 사방넷 UI [배송희망일·20260716·신규주문] 82건 ↔ API cond=1 84건(그 사이 2건 인입) 일치.
      //         cond=1 반환건은 배송희망일이 100% 조회일과 일치, 주문일은 36/84만 일치 → 주문일 기준 아님.
      //         참고: 주문일 기준은 cond=2 (36건). cond=3·4·5는 0건.
      //   ※ 이 계정은 수집일==배송희망일이라 API상 두 기준의 결과가 동일 — 실무 영향 없음.
      dateSearchCondition: 1,
      page, perPage: 500,
      updateOrderStsYn: "N", // 절대 상태변경 없음 (읽기 전용)
      responseItems: ORDER_FIELDS,
      ...(orderStatusList && orderStatusList.length ? { orderStatusList } : {}),
    });
    const text = await getWithBody(`${base}/v3/sb/order`, headers, body);
    const j = JSON.parse(text);
    // 404 NOT_FOUND = 조건(상태 필터 등)에 맞는 주문 0건. 에러가 아니라 "결과 없음" →
    // 빈 배열로 처리(500 방어, 2026-07-14). 그 외 비정상 코드만 throw.
    if (String(j.code) === "404") break;
    if (String(j.code) !== "200") {
      throw new Error(`사방넷 주문 조회 실패 (code ${j.code}): ${String(j.message).substring(0, 120)}`);
    }
    all.push(...(j.data?.results ?? []));
    if (!j.data?.hasNext) break;
    page += 1;
    if (page > 40) break; // 안전장치 (2만 건 상한)
  }
  return all;
}

/**
 * CJ 송장 엑셀용 상품명 — 2026-07-09 실측 4/4 확정 규칙:
 * PRD_ABBR + " " + CM_SKU_NM, 단 옵션이 "단품"이거나 없으면 PRD_ABBR만
 */
export function composeProductName(order: Pick<SabangnetOrder, "PRD_ABBR" | "CM_SKU_NM">): string {
  const abbr = (order.PRD_ABBR ?? "").trim();
  const sku = (order.CM_SKU_NM ?? "").trim();
  return sku && sku !== "단품" ? `${abbr} ${sku}` : abbr;
}

/**
 * 전화번호 실질값 판정 — 사방넷은 빈 번호를 "- -" 더미로 반환한다 (2026-07-13 실측).
 * 숫자가 하나도 없으면 빈 값으로 취급.
 */
export function normalizePhone(raw: string | null): string {
  const v = (raw ?? "").trim();
  return /\d/.test(v) ? v : "";
}

/** KST 오늘 (yyyyMMdd) */
export function kstTodayCompact(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");
}
