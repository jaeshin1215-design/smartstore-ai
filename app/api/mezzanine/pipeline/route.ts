export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/claude";

interface PipelineInput {
  urls: string[];          // 수동으로 수집한 브랜드 URL (인스타 또는 웹사이트)
  category: string;
  zone?: string;           // 기본값: settle_a_upper
  season?: string;
  region?: string;
}

interface BrandAnalysis {
  matrix_x: number;
  matrix_y: number;
  dong: string;
  reason: string;
  name_hint: string;       // AI가 URL에서 추정한 브랜드 식별자 (실명 아님)
}

async function checkAlive(url: string): Promise<boolean> {
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

async function analyzeUrl(url: string, category: string): Promise<BrandAnalysis> {
  const prompt = `아래 URL은 팝업 공간 입점 후보 브랜드의 인스타그램 또는 웹사이트입니다.

URL: ${url}
카테고리: ${category}
공간: 메자닌 북가좌 — 서울 서대문구 증산역, 복합문화공간 350평 (A동:체험, B동:쇼룸, C동:로컬)

다음 기준으로만 분석하고 JSON만 반환하세요:
{
  "matrix_x": 공간적합도 1~100 정수,
  "matrix_y": 집객력 1~100 정수,
  "dong": "A" 또는 "B" 또는 "C",
  "reason": "판단근거 1~2문장 (URL 기반 추정, 실명 금지)",
  "name_hint": "URL에서 추정한 익명 식별자 예: wellness_brand_a7f2 (실명 절대 금지)"
}

⚠️ 실명/상호 출력 절대 금지. JSON만.`;

  try {
    const raw   = await callClaude(prompt, 300);
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error("JSON 없음");
    const p = JSON.parse(match[0]) as Partial<BrandAnalysis>;
    return {
      matrix_x:  Math.min(100, Math.max(1, Number(p.matrix_x) || 50)),
      matrix_y:  Math.min(100, Math.max(1, Number(p.matrix_y) || 50)),
      dong:      ["A", "B", "C"].includes(String(p.dong)) ? String(p.dong) : "TBD",
      reason:    String(p.reason || ""),
      name_hint: String(p.name_hint || "brand_" + Math.random().toString(36).slice(2, 6)),
    };
  } catch {
    return { matrix_x: 50, matrix_y: 50, dong: "TBD", reason: "", name_hint: "brand_" + Math.random().toString(36).slice(2, 6) };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PipelineInput;
    const { urls, category, zone = "settle_a_upper", season = "all", region = "서울" } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls 배열 필수" }, { status: 400 });
    }

    const results = {
      input:     urls.length,
      dead:      0,
      saved:     0,
      skipped:   0,
      brands:    [] as { id: string; url: string; name_hint: string; dong: string }[],
    };

    for (const rawUrl of urls.slice(0, 10)) {
      const url = rawUrl.trim();
      if (!url) continue;

      // 1. 생존 필터 (HTTP 200 — AI 호출 아님, 무비용)
      const alive = await checkAlive(url);
      if (!alive) {
        results.dead++;
        continue;
      }

      // 2. AI 1차 검증 (실존성+적합도, 산 것만)
      const analysis = await analyzeUrl(url, category);

      // 3. DB 저장 (ai_draft — 실명 0, Gate A 전)
      const id = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const core_info = JSON.stringify({ zone, followers: 0, popup_count: 0, region });

      try {
        await db.execute({
          sql: `INSERT INTO mezzanine_brands
                  (id, name, instagram_handle, category, dong, season, followers, popup_count,
                   region, source_type, core_info, dynamic_filters, matrix_x, matrix_y,
                   gemini_reason, contact_status, status, url)
                VALUES (?, ?, '', ?, ?, ?, 0, 0, ?, 'DORKING', ?, '{}', ?, ?, ?, 'untouched', 'ai_draft', ?)`,
          args: [
            id,
            analysis.name_hint,   // 익명 식별자 (실명 0)
            category,
            analysis.dong,
            season,
            region,
            core_info,
            analysis.matrix_x,
            analysis.matrix_y,
            analysis.reason,
            url,
          ],
        });
        results.saved++;
        results.brands.push({ id, url, name_hint: analysis.name_hint, dong: analysis.dong });
      } catch {
        results.skipped++;
      }
    }

    return NextResponse.json({ ok: true, zone, category, ...results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
