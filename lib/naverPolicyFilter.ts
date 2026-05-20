import { NAVER_POLICY_RULES, PolicyLevel } from "./naverPolicyConfig";

export interface PolicyViolation {
  match: string;
  level: PolicyLevel;
  reason: string;
  index: number;
}

export interface PolicyFilterResult {
  violations: PolicyViolation[];
  bannedCount: number;
  warningCount: number;
  hasViolation: boolean;
  // 원문에 <mark> 태그 삽입된 HTML 문자열
  highlightedText: string;
}

export function filterNaverPolicy(text: string): PolicyFilterResult {
  const violations: PolicyViolation[] = [];

  // 각 규칙 적용
  for (const rule of NAVER_POLICY_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? "g" : "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      violations.push({
        match: match[0],
        level: rule.level,
        reason: rule.reason,
        index: match.index,
      });
    }
  }

  // 중복 제거 (같은 위치 중복 매칭 방지)
  const unique = violations.filter(
    (v, i, arr) => arr.findIndex((x) => x.index === v.index && x.match === v.match) === i
  );

  const bannedCount = unique.filter((v) => v.level === "banned").length;
  const warningCount = unique.filter((v) => v.level === "warning").length;

  // 하이라이트 HTML 생성 (뒤에서부터 치환 — index 유지)
  const sorted = [...unique].sort((a, b) => b.index - a.index);
  let highlighted = text;
  for (const v of sorted) {
    const before = highlighted.slice(0, v.index);
    const after = highlighted.slice(v.index + v.match.length);
    const cls = v.level === "banned" ? "policy-banned" : "policy-warning";
    highlighted = `${before}<mark class="${cls}" title="${v.reason}">${v.match}</mark>${after}`;
  }

  return {
    violations: unique,
    bannedCount,
    warningCount,
    hasViolation: unique.length > 0,
    highlightedText: highlighted,
  };
}
