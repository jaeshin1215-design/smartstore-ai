// 개인정보 마스킹 — 2026-07-09 확정 규칙
// 대상: 전화번호·주소 두 가지만. 이름·주문번호·운송장번호는 원본 그대로.
// 서버 응답(화면 표시용)은 기본 마스킹, 원본은 다운로드 파일에만 담는다.

/** 전화번호: 뒤 4자리만 마스킹 — 010-1234-**** */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const s = String(phone).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length < 4) return s;
  // 마지막 4자리 숫자를 ****로 — 하이픈 유무 모두 대응
  let masked = "";
  let remaining = 4;
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (/\d/.test(ch) && remaining > 0) {
      masked = "*" + masked;
      remaining -= 1;
    } else {
      masked = ch + masked;
    }
  }
  return masked;
}

/** 주소: 동(읍·면·리·가)까지 노출 후 마스킹 — "서울시 강남구 대치동 ······" */
export function maskAddr(addr: string | null | undefined): string {
  if (!addr) return "";
  const s = String(addr).trim();
  const tokens = s.split(/\s+/);
  let cut = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (/(동|읍|면|리|가)$/.test(tokens[i]) && !/^\d/.test(tokens[i])) {
      cut = i;
      break;
    }
  }
  // 행정구역 토큰을 못 찾으면 앞 3토큰까지만 노출
  const keep = cut >= 0 ? cut + 1 : Math.min(3, tokens.length);
  if (keep >= tokens.length) return s;
  return tokens.slice(0, keep).join(" ") + " ······";
}
