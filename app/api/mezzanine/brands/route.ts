import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/claude";

interface BrandRow {
  id: unknown;
  name: unknown;
  instagram_handle: unknown;
  category: unknown;
  dong: unknown;
  season: unknown;
  followers: unknown;
  popup_count: unknown;
  region: unknown;
  source_type: unknown;
  matrix_x: unknown;
  matrix_y: unknown;
  gemini_reason: unknown;
  contact_status: unknown;
  created_at: unknown;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category   = searchParams.get("category")    || "all";
    const dong       = searchParams.get("dong")         || "all";
    const season     = searchParams.get("season")       || "all";
    const sourceType = searchParams.get("source_type") || "all";
    const analyzed   = searchParams.get("analyzed")    === "true";

    let sql = "SELECT * FROM mezzanine_brands WHERE 1=1";
    const args: (string | number)[] = [];

    if (category   !== "all") { sql += " AND category = ?";                        args.push(category); }
    if (dong       !== "all") { sql += " AND dong = ?";                             args.push(dong); }
    if (season     !== "all") { sql += " AND (season = ? OR season = 'all')";       args.push(season); }
    if (sourceType !== "all") { sql += " AND source_type = ?";                      args.push(sourceType); }
    if (analyzed)             { sql += " AND gemini_reason != '' AND gemini_reason IS NOT NULL"; }

    sql += " ORDER BY created_at DESC LIMIT 100";

    const result = await db.execute({ sql, args });
    return NextResponse.json({ brands: result.rows as unknown as BrandRow[], total: result.rows.length });
  } catch (e) {
    return NextResponse.json({ brands: [], total: 0, error: String(e) });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, instagram_handle, category, followers, popup_count, region, season, source_type } = body as {
      name: string;
      instagram_handle?: string;
      category?: string;
      followers?: number | string;
      popup_count?: number | string;
      region?: string;
      season?: string;
      source_type?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name 필수" }, { status: 400 });
    }

    let matrix_x    = 50;
    let matrix_y    = 50;
    let dong        = "TBD";
    let gemini_reason = "";

    try {
      const prompt = `다음은 팝업 공간 입점 후보 브랜드입니다.

브랜드명: ${name.trim()}
인스타그램: ${instagram_handle?.trim() || "미입력"}
카테고리: ${category || "lifestyle"}
팔로워: ${followers || 0}명
팝업이력: ${popup_count || 0}회
활동지역: ${region?.trim() || "서울"}

메자닌 북가좌 (서울 서대문구 증산역, 복합문화공간) 기준:
- A동: 체험·이벤트형 (참여도 높은 브랜드)
- B동: 쇼룸·전시형 (시각적 경험 강조)
- C동: 라이프스타일·로컬형 (일상 밀착)

아래 4가지를 JSON 형식으로만 응답하세요. 추가 설명 없이 JSON만:
{"matrix_x": 공간적합도1~100정수, "matrix_y": 집객력1~100정수, "dong": "A또는B또는C", "reason": "판단근거1~2문장"}

주의: 실존 브랜드만 분석. 알 수 없으면 matrix_x/y 50, dong TBD, reason 빈 문자열.`;

      const raw = await callClaude(prompt, 300);
      const match = raw.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { matrix_x?: unknown; matrix_y?: unknown; dong?: unknown; reason?: unknown };
        matrix_x     = Math.min(100, Math.max(1, Number(parsed.matrix_x) || 50));
        matrix_y     = Math.min(100, Math.max(1, Number(parsed.matrix_y) || 50));
        dong         = ["A", "B", "C"].includes(String(parsed.dong)) ? String(parsed.dong) : "TBD";
        gemini_reason = String(parsed.reason || "");
      }
    } catch { /* fallback: 기본값 유지 */ }

    const id        = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const core_info = JSON.stringify({
      followers:   Number(followers)   || 0,
      popup_count: Number(popup_count) || 0,
      region:      region?.trim()      || "",
    });

    await db.execute({
      sql: `INSERT INTO mezzanine_brands
              (id, name, instagram_handle, category, dong, season, followers, popup_count, region,
               source_type, core_info, dynamic_filters, matrix_x, matrix_y, gemini_reason, contact_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, 'untouched')`,
      args: [
        id,
        name.trim(),
        instagram_handle?.trim() || "",
        category || "lifestyle",
        dong,
        season || "all",
        Number(followers)   || 0,
        Number(popup_count) || 0,
        region?.trim()      || "",
        source_type || "MANUAL",
        core_info,
        matrix_x,
        matrix_y,
        gemini_reason,
      ],
    });

    return NextResponse.json({ ok: true, id, name: name.trim(), matrix_x, matrix_y, dong, gemini_reason });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, contact_status } = await request.json() as { id?: string; contact_status?: string };
    if (!id || !contact_status) {
      return NextResponse.json({ error: "id, contact_status 필수" }, { status: 400 });
    }
    const valid = ["untouched", "contacted", "replied"];
    if (!valid.includes(contact_status)) {
      return NextResponse.json({ error: "유효하지 않은 상태 (untouched|contacted|replied)" }, { status: 400 });
    }
    await db.execute({
      sql: "UPDATE mezzanine_brands SET contact_status = ? WHERE id = ?",
      args: [contact_status, id],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
