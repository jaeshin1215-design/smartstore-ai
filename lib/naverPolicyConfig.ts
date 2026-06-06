export type PolicyLevel = "banned" | "warning";

export interface PolicyRule {
  pattern: RegExp;
  level: PolicyLevel;
  reason: string;
}

// 네이버 스마트스토어 정책 위반 규칙
export const NAVER_POLICY_RULES: PolicyRule[] = [
  // ── 금지 표현 (즉시 판매 중지 위험) ──────────────────────────────
  { pattern: /1위/g,               level: "banned",  reason: "순위 표현 — 근거 없는 1위 주장 금지" },
  { pattern: /최저가/g,            level: "banned",  reason: "최저가 표현 — 실제 비교 근거 없으면 금지" },
  { pattern: /최고[품질가]*/g,     level: "banned",  reason: "최고 표현 — 절대적 우위 주장 금지" },
  { pattern: /최상[급품]*/g,       level: "banned",  reason: "최상급 표현 금지" },
  { pattern: /100\s*%\s*보장/g,    level: "banned",  reason: "100% 보장 — 허위 보증 금지" },
  { pattern: /효능|효과 보장/g,    level: "banned",  reason: "효능·효과 보장 표현 금지" },
  { pattern: /의학적[으로]?\s*증명/g, level: "banned", reason: "의학적 증명 주장 금지" },
  { pattern: /FDA\s*승인/g,        level: "banned",  reason: "FDA 승인 — 허위 인증 표현 금지" },
  { pattern: /특허[받은]*/g,       level: "banned",  reason: "특허 표현 — 실제 특허 번호 없으면 금지" },
  { pattern: /무한\s*리필/g,       level: "banned",  reason: "무한 제공 표현 금지" },
  { pattern: /원가[에]?\s*판매/g,  level: "banned",  reason: "원가 판매 — 과장 할인 표현 금지" },
  { pattern: /타사\s*대비/g,       level: "banned",  reason: "비교 광고 — 타사 비방 금지" },
  { pattern: /경쟁사보다/g,        level: "banned",  reason: "경쟁사 비교 금지" },
  { pattern: /유일한?\s*제품/g,    level: "banned",  reason: "유일성 주장 — 근거 없으면 금지" },

  // ── 경고 표현 (주의 필요, 수정 권장) ────────────────────────────
  { pattern: /대박/g,              level: "warning", reason: "과장 표현 — 과대광고로 오해 소지" },
  { pattern: /완판/g,              level: "warning", reason: "완판 표현 — 재고 조작 의심 소지" },
  { pattern: /한정\s*수량/g,       level: "warning", reason: "한정 수량 — 허위 희소성 조장 주의" },
  { pattern: /품절\s*임박/g,       level: "warning", reason: "품절 임박 — 허위 긴박감 조장 주의" },
  { pattern: /오늘만/g,            level: "warning", reason: "오늘만 특가 — 반복 사용 시 허위광고" },
  { pattern: /지금\s*아니면/g,     level: "warning", reason: "긴박감 조장 표현 주의" },
  { pattern: /무료\s*배송/g,       level: "warning", reason: "무료 배송 — 조건부일 경우 명시 필요" },
  { pattern: /사은품/g,            level: "warning", reason: "사은품 — 실제 제공 여부 명시 필요" },
  { pattern: /추가\s*증정/g,       level: "warning", reason: "증정품 — 조건 명시 없으면 주의" },
  { pattern: /천연\s*성분/g,       level: "warning", reason: "천연 표현 — 성분 근거 명시 필요" },
  { pattern: /무농약|유기농/g,     level: "warning", reason: "인증 표현 — 인증서 근거 필요" },
  { pattern: /피부\s*개선/g,       level: "warning", reason: "기능성 주장 — 식약처 인증 없으면 주의" },
  { pattern: /다이어트/g,          level: "warning", reason: "다이어트 효과 주장 — 근거 필요" },
  { pattern: /탈모/g,              level: "warning", reason: "탈모 관련 — 의약외품 허가 없으면 주의" },
  { pattern: /리뷰\s*이벤트/g,     level: "warning", reason: "리뷰 유도 이벤트 — 조건부 리뷰 금지 정책 주의" },

  // ── 실증 자료 필요 표현 (표시광고법·KC인증 관련) ──────────────────
  { pattern: /\d+\s*kg\s*(견고|하중|내구|지지)/g, level: "warning", reason: "하중·강도 수치 — KC인증서·시험성적서 실측 근거 필요 (표시광고법)" },
  { pattern: /(견고성|내구성|강도)\s*\d+/g,       level: "warning", reason: "강도 수치 주장 — 시험성적서 근거 없으면 위반" },
  { pattern: /\d+\s*배\s*(더|강|튼튼|오래)/g,     level: "warning", reason: "N배 비교 주장 — 비교 대상·근거 명시 없으면 금지" },
  { pattern: /KC\s*인증/g,                        level: "warning", reason: "KC인증 표현 — 인증번호 병기 필수. 번호 없으면 허위인증 위험" },
  { pattern: /안전\s*인증/g,                      level: "warning", reason: "안전인증 표현 — KC 인증번호·발급기관 명시 필요" },
  { pattern: /평생\s*(보증|AS|무상)/g,            level: "warning", reason: "평생 보증 — 실제 이행 가능 여부 확인 필요" },
  { pattern: /\d+\s*년\s*보증/g,                  level: "warning", reason: "N년 보증 — 보증 조건·범위 명시 필요" },
  { pattern: /임상\s*(시험|결과|증명)/g,           level: "banned",  reason: "임상 표현 — 식약처 허가 없는 임상 주장 금지" },
  { pattern: /과학적\s*(증명|검증)/g,             level: "banned",  reason: "과학적 증명 주장 — 공인기관 근거 없으면 금지" },
];
