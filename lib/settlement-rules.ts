// 채널별 정산 규칙 단일 맵 (이지스토리 IZ 전용) — 2026-07-17 신설
// "배율 구조는 자산, 값의 코드 박제는 부채" 원칙: 채널-규칙을 한 곳에 모아 2호 때 설정화면/DB로 이관 쉽게.
//   T5(이다슬 5채널) + T6(박혜미 정산매출 채널) 통합. ProfitSimulatorTab·정산매출 라우트가 여기서 import.
//   채널명 키는 파일 원문 표기 그대로 완전일치(정규화·부분일치 없음). 별칭은 aliases 배열로.

export type SupplyMode = "auto" | "manual";

export interface ChannelRule {
  supplyMode: SupplyMode;   // auto = 공급가 N을 파일 값 그대로 사용(재계산 금지) / manual = N 없으면 M×배율 생성
  multiplier?: number;      // manual 채널의 M×배율 (auto엔 없음)
  shippingFactor?: number;  // 배송비매출 G = F/1.1 × shippingFactor (기본 1). 오늘의집 0.9667, 스마트스토어 0.96, 이모야킨지로 0
  zeroCost?: boolean;       // 원가 R=0 강제 (이모야킨지로 — 위탁 운영수수료 채널)
  aliases?: string[];       // 동일 채널 별칭 (완전일치 대상에 함께 포함)
  group?: "T5" | "T6";      // 소속(파생 맵 생성·검증용)
}

// 물류처 화이트리스트: 이 두 문자열과 "완전 일치"가 아니면 S·T·U 빈칸 + V=R (패턴 매칭 금지)
export const CROSS_LOGISTICS = ["오포물류", "유비엘"] as const;

// 스타배송 제외(확정 규칙): 지마켓/옥션 물류처 배송 주문은 일반 주문과 별도 관리 →
//   정산매출 정제에서 제외 (2026-07-20 박혜미 프로 확인, 정식 규칙으로 격상).
//
//   ⚠️ 판정 필드 주의 — 실측 결과(0628-0630 파일, 전수 대조):
//      · 물류처(Y) 열은 스타배송 건도 "오포물류"로 찍힘 → 물류처로는 판정 불가
//      · 실제 식별자는 상품명 끝의 "/스타배송" 태그뿐 → 상품명 부분일치로 판정
//      · 이 규칙으로 정제전 101행 → 92행 (박혜미 정제후 파일과 행수 일치) 재현됨
//   ※ 상품명 표기가 바뀌면 깨지는 규칙이므로, 장기적으로는 전용 플래그 열 권장.
//   ※ 제외 건수는 조용히 버리지 않고 SettleResult.excluded 로 집계·노출한다.
export const EXCLUDED_PRODUCT_MARKERS = ["스타배송"] as const;
const ONEDAY_SHIP = 1 - 0.0333; // 오늘의집 배송비 계수 0.9667 (박혜미 STEP2 예외)

export const CHANNEL_RULES: Record<string, ChannelRule> = {
  // ── T5 (이다슬) — 195건 전수대조 확정. 값 1원도 불변 ──
  "띵샵(신)":       { supplyMode: "manual", multiplier: 0.88, group: "T5" },
  "원룸만들기":      { supplyMode: "manual", multiplier: 0.85, group: "T5" },
  "현대홈쇼핑(3)":   { supplyMode: "manual", multiplier: 1.1, group: "T5" },
  "(통합)블루베리":  { supplyMode: "manual", multiplier: 0.85, group: "T5" },
  "이모야킨지로":    { supplyMode: "manual", multiplier: 0.08, shippingFactor: 0, zeroCost: true, group: "T5" },
  "스마트스토어":    { supplyMode: "auto", shippingFactor: 0.96, group: "T5" }, // 배율 없음(N 직접), 배송비만 ×0.96

  // ── T6 (박혜미) auto 채널 — 공급가 N 자동수집, O=N/1.1 (N 재계산 금지) ──
  "에이블리":       { supplyMode: "auto", group: "T6" },
  "GS SHOP":       { supplyMode: "auto", group: "T6" },
  "ESM옥션":       { supplyMode: "auto", aliases: ["ESM 옥션"], group: "T6" },
  "ESM지마켓":      { supplyMode: "auto", aliases: ["ESM 지마켓"], group: "T6" },
  "롯데홈쇼핑(신)":  { supplyMode: "auto", group: "T6" },
  "CJ온스타일":     { supplyMode: "auto", group: "T6" },
  "오늘의집":       { supplyMode: "auto", shippingFactor: ONEDAY_SHIP, group: "T6" }, // 배송비 특례 F×0.9667/1.1
  "11번가":        { supplyMode: "auto", group: "T6" },
  "카카오스타일":    { supplyMode: "auto", aliases: ["지그재그", "포스티"], group: "T6" },
  "레안어스":       { supplyMode: "auto", group: "T6" },

  // ── T6 (박혜미) manual 채널 — 공급가 없음, N=M×배율 생성 후 O=N/1.1 ──
  "T deal":        { supplyMode: "manual", multiplier: 0.85, group: "T6" }, // 0.85 확정 (2026-07-20 박혜미 프로 파일 대조 확인. 안내문 원문 0.87은 오기로 확인됨)
  "해피마켓":       { supplyMode: "manual", multiplier: 0.85, group: "T6" },
  "카카오톡스토어":   { supplyMode: "manual", multiplier: 0.83, group: "T6" },
  "Grip":          { supplyMode: "manual", multiplier: 0.89, group: "T6" },
  "올웨이즈":       { supplyMode: "manual", multiplier: 0.85, group: "T6" },
  "AliExpress":    { supplyMode: "manual", multiplier: 0.91, aliases: ["★알리익스프레스★"], group: "T6" },
  "보고 cafe24":    { supplyMode: "manual", multiplier: 0.9, aliases: ["보고플레이"], group: "T6" }, // ⚠️ 옵션 반영 실판매가 이슈 — M 출처 컬럼 회신 대기(보류 슬롯)
  "무신사":         { supplyMode: "manual", multiplier: 0.7, group: "T6" },
  "배달의민족":      { supplyMode: "manual", multiplier: 0.85, group: "T6" },
};

// 별칭 → 정규 키 역인덱스
const ALIAS_TO_KEY: Record<string, string> = {};
for (const [key, rule] of Object.entries(CHANNEL_RULES)) {
  for (const a of rule.aliases ?? []) ALIAS_TO_KEY[a] = key;
}

/** 채널명(원문 표기)으로 규칙 조회 — 완전일치 + 별칭만. 정규화·부분일치 없음. */
export function resolveChannelRule(name: string): { key: string; rule: ChannelRule } | undefined {
  const n = String(name ?? "").trim();
  if (CHANNEL_RULES[n]) return { key: n, rule: CHANNEL_RULES[n] };
  const aliasKey = ALIAS_TO_KEY[n];
  if (aliasKey) return { key: aliasKey, rule: CHANNEL_RULES[aliasKey] };
  return undefined;
}

/** 물류처 완전일치 판정 */
export function isCrossLogistics(y: string): boolean {
  return (CROSS_LOGISTICS as readonly string[]).includes(String(y ?? "").trim());
}

/** 스타배송 제외 판정 — 상품명에 제외 마커가 포함되면 true (실측 근거: 상단 주석) */
export function isExcludedOrder(productName: string): boolean {
  const n = String(productName ?? "");
  return (EXCLUDED_PRODUCT_MARKERS as readonly string[]).some(m => n.includes(m));
}

// ── ProfitSimulatorTab(T5) 하위호환 파생 맵 — 정본(CHANNEL_RULES)에서 생성. 값 이전만, 로직·결과 불변 ──
export const T5_MULTIPLIERS: Record<string, number> = Object.fromEntries(
  Object.entries(CHANNEL_RULES)
    .filter(([, r]) => r.group === "T5" && r.supplyMode === "manual" && r.multiplier != null)
    .map(([k, r]) => [k, r.multiplier as number])
);
export const T5_SHIPPING: Record<string, number> = Object.fromEntries(
  Object.entries(CHANNEL_RULES)
    .filter(([, r]) => r.group === "T5" && r.shippingFactor != null)
    .map(([k, r]) => [k, r.shippingFactor as number])
);
export const T5_ZEROCOST: string[] = Object.entries(CHANNEL_RULES)
  .filter(([, r]) => r.group === "T5" && r.zeroCost)
  .map(([k]) => k);
