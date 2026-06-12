export const maxDuration = 30;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkUrlAlive } from "@/lib/survivalCheck";

interface PipelineInput {
  urls: string[];
  category: string;
  zone?: string;
  season?: string;
  region?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PipelineInput;
    const { urls, category, zone = "settle_a_upper", season = "all", region = "서울" } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls 배열 필수" }, { status: 400 });
    }

    const results = {
      input:   urls.length,
      dead:    0,
      saved:   0,
      skipped: 0,
      brands:  [] as { id: string; url: string }[],
    };

    for (const rawUrl of urls.slice(0, 20)) {
      const url = rawUrl.trim();
      if (!url) continue;

      // 생존 필터: 비인스타 명백한 실패만 탈락 (인스타는 사람 Gate A가 검문)
      const alive = await checkUrlAlive(url);
      if (!alive) {
        results.dead++;
        continue;
      }

      // ai_draft 저장 — AI 분석은 Gate A 확정 후 실행 (사람 검문 통과한 것만 토큰 소비)
      const id         = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const shortId    = id.slice(-4).toUpperCase();
      const core_info  = JSON.stringify({ zone, followers: 0, popup_count: 0, region });

      try {
        await db.execute({
          sql: `INSERT INTO mezzanine_brands
                  (id, name, instagram_handle, category, dong, season, followers, popup_count,
                   region, source_type, core_info, dynamic_filters, matrix_x, matrix_y,
                   gemini_reason, contact_status, status, url)
                VALUES (?, ?, '', ?, 'TBD', ?, 0, 0, ?, 'DORKING', ?, '{}', 50, 50, '', 'untouched', 'ai_draft', ?)`,
          args: [id, `후보_${shortId}`, category, season, region, core_info, url],
        });
        results.saved++;
        results.brands.push({ id, url });
      } catch {
        results.skipped++;
      }
    }

    return NextResponse.json({ ok: true, zone, category, ...results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
