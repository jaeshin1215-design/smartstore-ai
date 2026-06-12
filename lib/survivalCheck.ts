// 인스타그램 생존 판별은 서버측에서 구조적 불가 (봇 차단으로 dead signal 수신 불가)
// → 비인스타 URL의 명백한 네트워크 실패(4xx/5xx)만 탈락 처리

export function isInstagramUrl(url: string): boolean {
  return url.includes("instagram.com");
}

export async function checkUrlAlive(url: string): Promise<boolean> {
  // 인스타 URL은 생존 판별 불가 → 무조건 통과 (사람 Gate A가 진짜 검문)
  if (isInstagramUrl(url)) return true;

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MezzanineBot/1.0)" },
    });
    return res.status < 400;
  } catch {
    return false;
  }
}
