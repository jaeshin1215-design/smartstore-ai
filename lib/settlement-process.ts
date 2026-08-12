// T6 정산매출 정제 처리 (박혜미) — 사방넷 정산매출 원본 → 손익 계산 정제행. 라우트·검증·UI 공용.
//   규칙: lib/settlement-rules.ts. 계산 로직은 T5(이다슬)와 동일 프레임 + 채널 supplyMode.
import { resolveChannelRule, isCrossLogistics, isExcludedOrder } from "./settlement-rules";

// AG/AH/AI 열명 — 박혜미 파일과 동일. AH·AI는 셀 내 줄바꿈(Alt+Enter) 포함. SETTLEMENT_HEADERS·out 키 동시 참조(불일치 방지).
const H_AG = "배송비(비용)";
const H_AH = "위탁배송비\n(원가)";
const H_AI = "원가\n+위탁배송비";

// 정제후 35열 양식 헤더 순서 (박혜미 정제후 파일 기준). 계산열 = ★
//   2026-08-11 재편: 분류1/2/3(AD·AE·AF) + 실출고배송비 AG/AH 송장 dedup + AI(마진 원가기준).
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
  "분류1(소싱)", "분류2(대분류)", "분류3(상품명)", // AD·AE·AF 분류열(값 비움 · 박혜미 수기 입력용)
  H_AG, // ★AG 실출고배송비 中 당사물류(오포물류·오포_카노위탁·유비엘) — 참고비용, 원가 미산입. 송장 dedup.
  H_AH, // ★AH 실출고배송비 中 위탁(나머지 6곳) — 원가(AI)에 산입. 송장 dedup.
  H_AI, // ★AI = AB + AH(dedup 후). 마진율 원가 기준(박혜미 메일 원문 표기, 2026-08-11: AB→AI 전환)
] as const;

export interface SettleRowError { rowIndex: number; channel: string; field: string; raw: unknown; }
/** 정제 제외된 행 (스타배송 제외 규칙). 조용히 버리지 않고 집계·노출한다. */
export interface SettleExcluded { count: number; byChannel: Record<string, number>; rowIndexes: number[]; }
export interface ChannelAgg { channel: string; count: number; AA: number; AB: number; AH: number; U: number; mode: string; multiplier: number | null; resolved: boolean; }
export interface SettleResult {
  outRows: Record<string, unknown>[];   // 정제후 32열 순서 객체
  errors: SettleRowError[];
  channels: ChannelAgg[];
  totals: { count: number; AA: number; AB: number; AH: number; U: number };
  unresolvedChannels: string[];          // 규칙 맵에 없는 채널
  unresolvedProductCodes: string[];      // 배송비 기준표에 없는 사방넷품번코드 (실출고배송비 빈칸 처리, 0 아님)
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

const IN = { ch: "쇼핑몰", M: "판매가", N: "공급가", P: "원가", Q: "EA", F: "배송비(수집)", Y: "물류처", name: "상품명", code: "사방넷품번코드", invoice: "송장번호" };

// 실출고배송비 출력 계수 — 박혜미 프로 확인 대기(2026-08-06). 기본 ÷1.1 (계산열 G·O·R과 동일 VAT 제거).
//   테이블엔 VAT 포함 원값(예 2700) 저장. VAT 포함값 그대로 표기를 원하면 이 값만 1로 바꾸면 됨(한 줄).
const SHIPPING_OUT_DIVISOR = 1.1;

export function processSettlement(rawRows: Record<string, unknown>[], ratesMap?: Map<string, number>): SettleResult {
  const outRows: Record<string, unknown>[] = [];
  const errors: SettleRowError[] = [];
  const aggMap: Record<string, ChannelAgg> = {};
  const unresolved = new Set<string>();
  const unresolvedCodes = new Set<string>();
  const excluded: SettleExcluded = { count: 0, byChannel: {}, rowIndexes: [] };
  // 송장 dedup용 수집 — 출력행 인덱스(oi)·채널·송장·물류처(cross)·실출고배송비원값(shipRaw)·AB
  const ship: { oi: number; ch: string; invoice: string; cross: boolean; shipRaw: number; AB: number }[] = [];

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
    // [supplyColIsPrice] 공급가(N) 칸에 실제 판매가 → M이 0/빈값일 때만 N을 M으로 이동 후 N=M×배율 강제(원 N 무시).
    //   M에 유효값 있으면 건드리지 않음. (원룸만들기, 2026-08-08 이다슬)
    const priceInN = rule?.supplyColIsPrice === true && M === 0 && Nraw > 0;
    const Meff = priceInN ? Nraw : M;
    let Ncalc = priceInN
      ? (mult != null ? Meff * mult : 0)
      : (Nraw > 0 ? Nraw : (mult != null ? Meff * mult : 0));
    // [supplyVatAddBack] 공급가=VAT제외 순액 → O=N 되도록 ×1.1 보정 후 표준 ÷1.1.
    //   ★ 원본 입력 기준. 이미 보정된 파일 재입력 시 이중적용 주의. (현대홈쇼핑(3), 2026-08-08 이다슬)
    if (rule?.supplyVatAddBack === true) Ncalc = Ncalc * 1.1;
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
    if (priceInN) out["판매가"] = Meff; // 이동된 판매가 반영(원본 M=0 → 판매가)
    out["원가(-VAT)"] = R;
    out["부자재(2%)"] = S;
    out["로스(2%)"] = T;
    out["물류비(20%)"] = U;
    out["총원가"] = V;
    out["상품매출(배송비+매출)"] = AA;
    out["상품총원가"] = AB;

    // 분류열 3개(AD·AE·AF) — 값 비움(박혜미 수기 입력용, 2026-08-11). 입력에 값 있어도 강제 공란.
    out["분류1(소싱)"] = "";
    out["분류2(대분류)"] = "";
    out["분류3(상품명)"] = "";

    // 실출고배송비 원값(rate÷1.1) 수집 — AG/AH 배치·AI·AH집계는 송장 dedup 후 2패스에서 확정.
    //   ÷1.1 표기(SHIPPING_OUT_DIVISOR). 미등록 품번은 shipRaw=0 + 목록 노출(조용히 0 금지).
    //   AG(배송비(비용))=당사물류(cross)·참고비용(원가 미산입) / AH(위탁배송비(원가))=위탁·원가 산입.
    //   ★ 2026-08-11 박혜미: AH를 원가에 포함해 AI로 마진 산정 + 송장 dedup(부자재·로스는 cross에만·AH는 위탁에만 → 배타).
    let shipRaw = 0;
    if (ratesMap) {
      const code = String(row[IN.code] ?? "").trim();
      if (code) {
        const rate = ratesMap.get(code);
        if (rate != null && Number.isFinite(rate)) shipRaw = rate / SHIPPING_OUT_DIVISOR;
        else unresolvedCodes.add(code);
      }
    }
    // AG/AH/AI 기본 공란·AB (dedup 패스에서 승자 위탁행만 AH·AI 상향, 승자 당사행만 AG). 초기 복사값 덮어씀.
    out[H_AG] = ""; out[H_AH] = ""; out[H_AI] = AB;

    if (hasErr) out["_error"] = true;
    const oi = outRows.push(out) - 1;
    ship.push({ oi, ch, invoice: String(row[IN.invoice] ?? "").trim(), cross, shipRaw, AB });

    // 채널 집계 — AA/AB/U는 dedup 무관(여기서 가산). AH는 dedup 후 2패스에서 가산.
    const a = aggMap[ch] ?? (aggMap[ch] = { channel: ch, count: 0, AA: 0, AB: 0, AH: 0, U: 0, mode: rule?.supplyMode ?? "unknown", multiplier: rule?.multiplier ?? null, resolved: !!resolved });
    a.count++; a.AA += AA; a.AB += AB; a.U += typeof U === "number" ? U : 0;
  });

  // ── 송장 dedup (2026-08-11 박혜미 A안): 동일 송장 내 실출고배송비 = 최대값 1회.
  //   최대값을 낸 상품 행에 유지(동률=먼저 나온 행), 나머지 행 공란. 당사물류 AG·위탁 AH 전체 적용.
  //   물류처는 송장 단위 단일(데이터 검증) → AG/AH 충돌 없음. store 하드코딩 없음(2·3호 재사용).
  const byInvoice: Record<string, number[]> = {};
  ship.forEach((s, idx) => {
    const key = s.invoice !== "" ? s.invoice : `__row${idx}`; // 송장 없으면 각 행 독립(격리, dedup 미적용)
    (byInvoice[key] ??= []).push(idx);
  });
  for (const idxs of Object.values(byInvoice)) {
    let win = -1, max = 0;
    for (const idx of idxs) if (ship[idx].shipRaw > max) { max = ship[idx].shipRaw; win = idx; } // 동률=먼저 나온 행(> 이므로 후행 갱신 안 함)
    for (const idx of idxs) {
      const s = ship[idx];
      const keep = idx === win && max > 0;
      const val: number | "" = keep ? s.shipRaw : "";
      if (s.cross) outRows[s.oi][H_AG] = val;        // AG: 당사물류 참고비용
      else outRows[s.oi][H_AH] = val;                // AH: 위탁 원가
      const ahNum = (!s.cross && keep) ? s.shipRaw : 0;
      outRows[s.oi][H_AI] = s.AB + ahNum;            // AI = AB + dedup 후 AH
      const a = aggMap[s.ch]; if (a) a.AH += ahNum;  // 채널 AH 집계(dedup 반영)
    }
  }

  const channels = Object.values(aggMap).sort((x, y) => y.AA - x.AA);
  const totals = channels.reduce((t, c) => ({ count: t.count + c.count, AA: t.AA + c.AA, AB: t.AB + c.AB, AH: t.AH + c.AH, U: t.U + c.U }), { count: 0, AA: 0, AB: 0, AH: 0, U: 0 });
  return { outRows, errors, channels, totals, unresolvedChannels: [...unresolved], unresolvedProductCodes: [...unresolvedCodes], excluded };
}
