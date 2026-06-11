export const maxDuration = 30;

import { NextResponse } from "next/server";

interface SurvivalTarget {
  url?: string;
  instagram_handle?: string;
}

interface SurvivalResult extends SurvivalTarget {
  url_ok: boolean;
  instagram_ok: boolean;
  alive: boolean;
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MezzanineBot/1.0)" },
    });
    return res.status < 400;
  } catch {
    return false;
  }
}

async function checkInstagram(handle: string): Promise<boolean> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean) return false;
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(clean)}/`, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MezzanineBot/1.0)" },
    });
    // 404 = 계정 없음 또는 삭제, 200/301/302 = 생존
    return res.status !== 404;
  } catch {
    // 네트워크 오류는 생존으로 처리 (엄격 차단 회피)
    return true;
  }
}

export async function POST(request: Request) {
  try {
    const { targets } = await request.json() as { targets: SurvivalTarget[] };

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: "targets 배열 필수" }, { status: 400 });
    }

    const results: SurvivalResult[] = await Promise.all(
      targets.slice(0, 20).map(async (t) => {
        const url_ok       = t.url ? await checkUrl(t.url) : true;
        const instagram_ok = t.instagram_handle ? await checkInstagram(t.instagram_handle) : true;
        return {
          ...t,
          url_ok,
          instagram_ok,
          alive: url_ok && instagram_ok,
        };
      })
    );

    const alive = results.filter(r => r.alive).length;
    const dead  = results.length - alive;

    return NextResponse.json({ results, summary: { total: results.length, alive, dead } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
