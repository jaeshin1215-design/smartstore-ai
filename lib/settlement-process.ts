// T6 정산매출 정제 처리 (박혜미) — 사방넷 정산매출 원본 → 손익 계산 정제행. 라우트·검증·UI 공용.
//   규칙: lib/settlement-rules.ts. 계산 로직은 T5(이다슬)와 동일 프레임 + 채널 supplyMode.
import { resolveChannelRule, isCrossLogistics, isExcludedOrder } from "./settlement-rules";

// 정제후 32열 양식 헤더 순서 (박혜미 정제후 파일 기준). 계산열 = ★
export const SETTLEMENT_HEADERS = [
  "주문일자", "쇼핑몰주문번호", "주문번호(사방넷)", "수취인", "송장번호", "배송비(수집)",
  "배송비(매출)", // ★G
  "쇼핑몰", "상품코드", "상품명", "옵션", "수량", "판매가", "공급가",
  "매출(-VAT)", // ★O
  "원가", "EA",
  "원가(-VAT)", "부자재(2%)", "로스(2%)", "물류비(20%)", "총원가", // ★R S T U V
  "수집일", "사방넷품번코드", "물류처", "쇼핑몰명",
  "상품매출(배송비+매출)", "상품총원가", // ★AA AB
  "상품약어",
] as const;

export interface SettleRowError { rowIndex: number; channel: string; field: string; raw: unknown; }
/** 정제 제외된 행 (스타배송 제외 규칙). 조용히 버리지 않고 집계·노출한다. */
export interface SettleExcluded { count: number; byChannel: Record<string, number>; rowIndexes: number[]; }
export interface ChannelAgg { channel: string; count: number; AA: number; AB: number; U: number; mode: string; multiplier: number | null; resolved: boolean; }
export interface SettleResult {
  outRows: Record<string, unknown>[];   // 정제후 32열 순서 객체
  errors: SettleRowError[];
  channels: ChannelAgg[];
  totals: { count: number; AA: number; AB: number; U: number };
  unresolvedChannels: string[];          // 규칙 맵에 없는 채널
  excluded: SettleExcluded;              // 물류처 제외 규칙으로 빠진 행 (스타배송 등)
}

// 텍스트형 숫자 → 숫자 (콤마·공백 제거). 빈 값은 0. 빈 아닌데 숫자 아니면 null(오류).
function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/,/g, "").replace(/\s/g, "").trim();
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const IN = { ch: "쇼핑몰", M: "판매가", N: "공급가", P: "원가", Q: "EA", F: "배송비(수집)", Y: "물류처", name: "상품명" };

export function processSettlement(rawRows: Record<string, unknown>[]): SettleResult {
  const outRows: Record<string, unknown>[] = [];
  const errors: SettleRowError[] = [];
  const aggMap: Record<string, ChannelAgg> = {};
  const unresolved = new Set<string>();
  const excluded: SettleExcluded = { count: 0, byChannel: {}, rowIndexes: [] };

  rawRows.forEach((row, i) => {
    // 제외 규칙(확정): 스타배송 주문은 별도 관리 → 정제 대상에서 뺀다.
    //   판정은 상품명의 "/스타배송" 태그 (물류처 열은 오포물류로 찍힘 — settlement-rules 주석 참조).
    //   2026-07-20 박혜미 프로 확인 + 0628-0630 파일 전수 대조로 검증.
    if (isExcludedOrder(String(row[IN.name] ?? ""))) {
      excluded.count++;
      const ch0 = String(row[IN.ch] ?? "").trim() || "(채널없음)";
      excluded.byChannel[ch0] = (excluded.byChannel[ch0] ?? 0) + 1;
      excluded.rowIndexes.push(i + 2); // 엑셀 행번호(헤더 1행 기준)
      return;
    }

    const ch = String(row[IN.ch] ?? "").trim();
    const resolved = resolveChannelRule(ch);
    const rule = resolved?.rule;
    if (!resolved && ch) unresolved.add(ch);

    // M~X 숫자 변환 (실패 시 오류 기록, 조용히 0 처리 금지)
    const nums: Record<string, number> = {};
    let hasErr = false;
    for (const [k, col] of Object.entries({ M: IN.M, N: IN.N, P: IN.P, Q: IN.Q, F: IN.F })) {
      const p = parseNum(row[col]);
      if (p === null) { errors.push({ rowIndex: i + 2, channel: ch, field: col, raw: row[col] }); hasErr = true; nums[k] = 0; }
      else nums[k] = p;
    }
    const { M, N: Nraw, P, Q, F } = nums;
    const Y = String(row[IN.Y] ?? "").trim();

    // 매출측: manual → N 있으면 파일값 우선, 없으면 M×배율 / auto → N 그대로 (재계산 금지)
    const mult = rule?.supplyMode === "manual" ? (rule.multiplier ?? null) : null;
    const Ncalc = Nraw > 0 ? Nraw : (mult != null ? M * mult : 0);
    const O = Ncalc / 1.1;
    let G = F / 1.1;
    if (rule?.shippingFactor != null) G *= rule.shippingFactor;
    const AA = G + O;
    // 원가측
    const R = rule?.zeroCost ? 0 : (P * Q) / 1.1;
    const cross = isCrossLogistics(Y);
    const S = cross ? R * 0.02 : "";
    const T = cross ? R * 0.02 : "";
    const U = cross ? R * 0.2 : "";
    const V = R + (typeof S === "number" ? S : 0) + (typeof T === "number" ? T : 0);
    const AB = V;

    // 정제후 32열 객체 — 원본 열 유지 + 계산열 채움
    const out: Record<string, unknown> = {};
    for (const h of SETTLEMENT_HEADERS) out[h] = row[h] ?? "";
    out["배송비(매출)"] = G;
    out["공급가"] = Ncalc;
    out["매출(-VAT)"] = O;
    out["원가(-VAT)"] = R;
    out["부자재(2%)"] = S;
    out["로스(2%)"] = T;
    out["물류비(20%)"] = U;
    out["총원가"] = V;
    out["상품매출(배송비+매출)"] = AA;
    out["상품총원가"] = AB;
    if (hasErr) out["_error"] = true;
    outRows.push(out);

    // 채널 집계
    const a = aggMap[ch] ?? (aggMap[ch] = { channel: ch, count: 0, AA: 0, AB: 0, U: 0, mode: rule?.supplyMode ?? "unknown", multiplier: rule?.multiplier ?? null, resolved: !!resolved });
    a.count++; a.AA += AA; a.AB += AB; a.U += typeof U === "number" ? U : 0;
  });

  const channels = Object.values(aggMap).sort((x, y) => y.AA - x.AA);
  const totals = channels.reduce((t, c) => ({ count: t.count + c.count, AA: t.AA + c.AA, AB: t.AB + c.AB, U: t.U + c.U }), { count: 0, AA: 0, AB: 0, U: 0 });
  return { outRows, errors, channels, totals, unresolvedChannels: [...unresolved], excluded };
}
