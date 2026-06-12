import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callClaude } from "@/lib/claude";

interface BrandRow {
  id: unknown; name: unknown; instagram_handle: unknown; category: unknown;
  dong: unknown; season: unknown; followers: unknown; popup_count: unknown;
  region: unknown; source_type: unknown; matrix_x: unknown; matrix_y: unknown;
  gemini_reason: unknown; contact_status: unknown; created_at: unknown;
  status: unknown; url: unknown; area_sqm: unknown; area_confirmed: unknown;
}

// ai_draft 브랜드는 실명 대신 익명 식별자 반환 (실명 노출 게이트)
function maskIfDraft(row: BrandRow): BrandRow {
  const status = String(row.status ?? "ai_draft");
  if (status !== "MANUAL_VERIFIED") {
    const shortId = String(row.id ?? "").slice(-4).toUpperCase();
    return { ...row, name: `AI 발굴 후보 #${shortId}`, instagram_handle: "" };
  }
  return row;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category   = searchParams.get("category")    || "all";
    const dong       = searchParams.get("dong")         || "all";
    const season     = searchParams.get("season")       || "all";
    const sourceType = searchParams.get("source_type") || "all";
    const analyzed   = searchParams.get("analyzed")    === "true";
    const status     = searchParams.get("status")      || "all";

    let sql = "SELECT * FROM mezzanine_brands WHERE 1=1";
    const args: (string | number)[] = [];

    if (category   !== "all") { sql += " AND category = ?";                  args.push(category); }
    if (dong       !== "all") { sql += " AND dong = ?";                      args.push(dong); }
    if (season     !== "all") { sql += " AND (season = ? OR season = 'all')"; args.push(season); }
    if (sourceType !== "all") { sql += " AND source_type = ?";               args.push(sourceType); }
    if (status     !== "all") { sql += " AND (status = ? OR (status IS NULL AND ? = 'ai_draft'))"; args.push(status, status); }
    if (analyzed)             { sql += " AND gemini_reason != '' AND gemini_reason IS NOT NULL"; }

    sql += " ORDER BY created_at DESC LIMIT 100";

    const result = await db.execute({ sql, args });
    const brands = (result.rows as unknown as BrandRow[]).map(maskIfDraft);
    return NextResponse.json({ brands, total: brands.length });
  } catch (e) {
    return NextResponse.json({ brands: [], total: 0, error: String(e) });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, instagram_handle, category, followers, popup_count, region, season, source_type, url } = body as {
      name: string; instagram_handle?: string; category?: string;
      followers?: number | string; popup_count?: number | string;
      region?: string; season?: string; source_type?: string; url?: string;
    };

    if (!name?.trim()) return NextResponse.json({ error: "name 필수" }, { status: 400 });

    let matrix_x = 50, matrix_y = 50, dong = "TBD", gemini_reason = "";

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

JSON만 응답:
{"matrix_x": 1~100정수, "matrix_y": 1~100정수, "dong": "A|B|C", "reason": "판단근거1~2문장"}

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
    } catch { /* fallback */ }

    const id        = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const core_info = JSON.stringify({ followers: Number(followers) || 0, popup_count: Number(popup_count) || 0, region: region?.trim() || "" });
    const newStatus = source_type === "MANUAL" && gemini_reason ? "MANUAL_VERIFIED" : "ai_draft";

    await db.execute({
      sql: `INSERT INTO mezzanine_brands
              (id, name, instagram_handle, category, dong, season, followers, popup_count, region,
               source_type, core_info, dynamic_filters, matrix_x, matrix_y, gemini_reason, contact_status, status, url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, 'untouched', ?, ?)`,
      args: [
        id, name.trim(), instagram_handle?.trim() || "", category || "lifestyle",
        dong, season || "all", Number(followers) || 0, Number(popup_count) || 0, region?.trim() || "",
        source_type || "MANUAL", core_info, matrix_x, matrix_y, gemini_reason,
        newStatus, url?.trim() || "",
      ],
    });

    return NextResponse.json({ ok: true, id, name: name.trim(), matrix_x, matrix_y, dong, gemini_reason, status: newStatus });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: string; contact_status?: string; status?: string };
    const { id, contact_status, status } = body;

    if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

    if (status) {
      const validStatus = ["ai_draft", "MANUAL_VERIFIED"];
      if (!validStatus.includes(status)) {
        return NextResponse.json({ error: "유효하지 않은 status (ai_draft|MANUAL_VERIFIED)" }, { status: 400 });
      }
      // Gate A 확정: 사람이 실존 검증 완료 → 이제 AI 분석 실행 (토큰 낭비 0)
      if (status === "MANUAL_VERIFIED") {
        // 현재 브랜드 데이터 조회
        const row = await db.execute({ sql: "SELECT * FROM mezzanine_brands WHERE id = ?", args: [id] });
        const brand = row.rows[0] as Record<string, unknown> | undefined;

        let matrix_x = 50, matrix_y = 50, dong = "TBD", gemini_reason = "";

        if (brand) {
          try {
            const url      = String(brand.url      || "");
            const category = String(brand.category || "lifestyle");
            const prompt   = `다음 브랜드 URL과 카테고리를 기반으로 메자닌 북가좌 입점 적합도를 분석하세요.

URL: ${url || "미제공"}
카테고리: ${category}
공간: 메자닌 북가좌 — 서울 서대문구 증산역, 복합문화공간 350평
- A동: 체험·이벤트형 / B동: 쇼룸·전시형 / C동: 라이프스타일·로컬형

JSON만 반환:
{"matrix_x": 1~100정수, "matrix_y": 1~100정수, "dong": "A"|"B"|"C", "reason": "판단근거 1~2문장 (실명 금지)"}

알 수 없으면 matrix_x/y 50, dong TBD, reason 빈 문자열.`;

            const raw   = await callClaude(prompt, 300);
            const match = raw.match(/\{[\s\S]*?\}/);
            if (match) {
              const p      = JSON.parse(match[0]) as { matrix_x?: unknown; matrix_y?: unknown; dong?: unknown; reason?: unknown };
              matrix_x     = Math.min(100, Math.max(1, Number(p.matrix_x) || 50));
              matrix_y     = Math.min(100, Math.max(1, Number(p.matrix_y) || 50));
              dong         = ["A", "B", "C"].includes(String(p.dong)) ? String(p.dong) : "TBD";
              gemini_reason = String(p.reason || "");
            }
          } catch { /* AI 실패 시 기본값 유지 */ }
        }

        await db.execute({
          sql: `UPDATE mezzanine_brands
                SET status = 'MANUAL_VERIFIED', matrix_x = ?, matrix_y = ?, dong = ?, gemini_reason = ?
                WHERE id = ?`,
          args: [matrix_x, matrix_y, dong, gemini_reason, id],
        });

        // contact_events append (Gate A 확정 기록)
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await db.execute({
          sql: `INSERT INTO contact_events (id, brand_id, event_type, payload) VALUES (?, ?, 'gate_a_confirmed', '{}')`,
          args: [eventId, id],
        });

        return NextResponse.json({ ok: true, status, matrix_x, matrix_y, dong, gemini_reason });
      }

      await db.execute({ sql: "UPDATE mezzanine_brands SET status = ? WHERE id = ?", args: [status, id] });
      return NextResponse.json({ ok: true, status });
    }

    if (contact_status) {
      const valid = ["untouched", "drafted", "contacted", "replied", "confirmed", "passed"];
      if (!valid.includes(contact_status)) {
        return NextResponse.json({ error: "유효하지 않은 contact_status" }, { status: 400 });
      }
      await db.execute({ sql: "UPDATE mezzanine_brands SET contact_status = ? WHERE id = ?", args: [contact_status, id] });

      // contact_events append
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO contact_events (id, brand_id, event_type, payload) VALUES (?, ?, ?, '{}')`,
        args: [eventId, id, contact_status],
      });
      return NextResponse.json({ ok: true, contact_status });
    }

    return NextResponse.json({ error: "status 또는 contact_status 중 하나 필수" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
