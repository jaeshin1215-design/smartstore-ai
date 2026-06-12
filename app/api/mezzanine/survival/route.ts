export const maxDuration = 30;

import { NextResponse } from "next/server";
import { checkUrlAlive, isInstagramUrl } from "@/lib/survivalCheck";

interface SurvivalTarget {
  url?: string;
  instagram_handle?: string;
}

interface SurvivalResult extends SurvivalTarget {
  url_ok: boolean;
  instagram_ok: boolean;
  alive: boolean;
  reason?: string;
}

export async function POST(request: Request) {
  try {
    const { targets } = await request.json() as { targets: SurvivalTarget[] };

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: "targets 배열 필수" }, { status: 400 });
    }

    const results: SurvivalResult[] = await Promise.all(
      targets.slice(0, 20).map(async (t) => {
        const url_ok = t.url ? await checkUrlAlive(t.url) : true;
        // 인스타 handle은 서버측 판별 불가 → 생존으로 처리 (사람 Gate A가 검문)
        const instagram_ok = true;
        const alive = url_ok && instagram_ok;
        const isInsta = t.url ? isInstagramUrl(t.url) : !!t.instagram_handle;
        return {
          ...t,
          url_ok,
          instagram_ok,
          alive,
          reason: !url_ok && !isInsta ? "URL 응답 없음 또는 에러" : undefined,
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
