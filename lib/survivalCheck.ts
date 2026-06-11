// Instagram은 없는 계정에도 HTTP 200 반환 → 본문 시그널 병행 필수

const DEAD_SIGNALS = [
  "Sorry, this page isn't available",
  "페이지를 사용할 수 없습니다",
  "The link you followed may be broken",
  "isn't available",
];

async function readBodyPrefix(res: Response, bytes = 4096): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  let body = "", read = 0;
  const decoder = new TextDecoder();
  try {
    while (read < bytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      body += decoder.decode(value, { stream: true });
      read += value.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return body;
}

export async function checkInstagramAlive(handleOrUrl: string): Promise<boolean> {
  // URL 또는 @handle 양쪽 처리
  let handle = handleOrUrl;
  const urlMatch = handleOrUrl.match(/instagram\.com\/([^/?#\s]+)/);
  if (urlMatch) handle = urlMatch[1];
  handle = handle.replace(/^@/, "").trim();
  if (!handle) return false;

  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      headers: {
        // 모바일 UA: 데스크톱보다 bot 차단이 덜함
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      },
    });

    if (res.status === 404) return false;
    // 429·403 = bot 차단 → 보수적으로 생존 처리 (false negative 방지)
    if (res.status === 429 || res.status === 403) return true;
    if (res.status !== 200) return res.status < 400;

    const body = await readBodyPrefix(res, 4096);
    return !DEAD_SIGNALS.some(s => body.includes(s));
  } catch {
    return true; // 타임아웃·네트워크 오류 → 생존으로 처리 (false negative 방지)
  }
}

export async function checkUrlAlive(url: string): Promise<boolean> {
  if (url.includes("instagram.com")) return checkInstagramAlive(url);
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
