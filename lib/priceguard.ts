// Price Guard — 쿠팡 마진율 판정 공통 로직
// 구조 (2026-07-09 이다슬 프로 정정): 이지스토리는 고정 공급가로 쿠팡에 납품(Supply).
// 판매가−공급가 = 쿠팡 마진. 판정 입력 = 쿠팡 마진율 (판매가−공급가)/판매가.
// 감지·계산·알림·이력만 담당 — 가격 결정·변경 기능 없음.

export type SafetyLevel = "안전" | "주의" | "위험";

// 공통 기본 임계값 (%) — 상품별 margin_warn_pct / margin_danger_pct로 재정의 가능
// [추측→조정 가능] 목업 기준값(27%→위험, 42%→주의, 58%→안전)과 정합하도록 설정.
// 이다슬 프로 확정값 나오면 여기 한 곳만 수정.
export const DEFAULT_MARGIN_WARN_PCT = 50;   // 이 미만이면 주의
export const DEFAULT_MARGIN_DANGER_PCT = 30; // 이 미만이면 위험

/** 쿠팡 마진율 (%) = (판매가 − 공급가) / 판매가 × 100. 계산 불가 시 null */
export function coupangMarginPct(salePrice: number | null, supplyPrice: number | null): number | null {
  if (!salePrice || !supplyPrice || salePrice <= 0) return null;
  return Math.round(((salePrice - supplyPrice) / salePrice) * 1000) / 10;
}

/** 마진율 → 3단계 판정. 임계값은 상품별 설정 우선, 없으면 공통 기본 */
export function judgeMargin(
  marginPct: number | null,
  warnPct?: number | null,
  dangerPct?: number | null
): SafetyLevel | null {
  if (marginPct == null) return null;
  const danger = dangerPct ?? DEFAULT_MARGIN_DANGER_PCT;
  const warn = warnPct ?? DEFAULT_MARGIN_WARN_PCT;
  if (marginPct < danger) return "위험";
  if (marginPct < warn) return "주의";
  return "안전";
}

/** 쿠팡 상품 URL → 상품ID 추출 (coupang.com/vp/products/{숫자}) */
export function extractCoupangProductId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/vp\/products\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * 쿠팡 URL 정규화 — 스킴 없는 입력("coupang.com/vp/...")은 확장의 tabs.create가
 * 상대경로로 해석해 수집이 실패하므로 저장 시점에 https://www.coupang.com 형태로 강제
 */
export function normalizeCoupangUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u = String(url).trim();
  if (u === "") return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const p = new URL(u);
    if (p.hostname === "coupang.com" || p.hostname === "m.coupang.com") p.hostname = "www.coupang.com";
    if (!p.hostname.endsWith("coupang.com")) return null;
    return p.toString();
  } catch {
    return null;
  }
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}
