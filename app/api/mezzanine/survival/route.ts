export const maxDuration = 30;

import { NextResponse } from "next/server";
import { checkInstagramAlive, checkUrlAlive } from "@/lib/survivalCheck";

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
        // URL이 인스타 URL이면 인스타 체크, 아니면 일반 HTTP
        const url_ok = t.url
          ? await checkUrlAlive(t.url)
          : true;

        // 별도 handle 제공 시 추가 인스타 체크
        const instagram_ok = t.instagram_handle
          ? await checkInstagramAlive(t.instagram_handle)
          : true;

        const alive = url_ok && instagram_ok;
        return {
          ...t,
          url_ok,
          instagram_ok,
          alive,
          reason: !url_ok
            ? "URL 응답 없음 또는 에러"
            : !instagram_ok
              ? "인스타 계정 없음 (에러 페이지 감지)"
              : undefined,
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
