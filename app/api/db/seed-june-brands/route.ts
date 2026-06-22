import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 6월 브랜드 시드 복구 — 이미 존재하면 upsert (중복 안전)
// POST /api/db/seed-june-brands

const JUNE_BRANDS = [
  // F&B 헤드라이너 (6월, bakery_fb)
  { name: "무슈부부",   instagram_handle: "monsieurcouple",   category: "bakery_fb", role: "headliner", month: 6 },
  { name: "버터베이커리", instagram_handle: "butter_bakery_kr", category: "bakery_fb", role: "headliner", month: 6 },
  { name: "생과방",     instagram_handle: "saengkwabang",     category: "bakery_fb", role: "headliner", month: 6 },
  { name: "폴앤폴리나", instagram_handle: "paulandpolina",    category: "bakery_fb", role: "headliner", month: 6 },
  { name: "GLT젤라또",  instagram_handle: "glt_gelato",       category: "bakery_fb", role: "headliner", month: 6 },
  { name: "연희양과점", instagram_handle: "yeonhee_bakery",   category: "bakery_fb", role: "headliner", month: 6 },
  // 타깃 파트너 (6월, wellness)
  { name: "아로마티카",  instagram_handle: "aromatica_official", category: "wellness", role: "target", month: 6 },
  { name: "SISAO",      instagram_handle: "sisao_official",    category: "wellness", role: "target", month: 6 },
  { name: "노크콤마",   instagram_handle: "knock_comma",       category: "wellness", role: "target", month: 6 },
  { name: "ARWE",       instagram_handle: "arwe_official",     category: "wellness", role: "target", month: 6 },
  { name: "레이비",     instagram_handle: "laivie_official",   category: "wellness", role: "target", month: 6 },
  { name: "셀바티코",   instagram_handle: "selvatico_kr",      category: "wellness", role: "target", month: 6 },
  { name: "더아로마샵", instagram_handle: "thearomashop",      category: "wellness", role: "target", month: 6 },
] as const;

export async function POST() {
  const log: string[] = [];
  let inserted = 0;
  let skipped  = 0;

  for (const b of JUNE_BRANDS) {
    // 핸들 기준 중복 체크
    const existing = await db.execute({
      sql: "SELECT id FROM mezzanine_brands WHERE instagram_handle = ? LIMIT 1",
      args: [b.instagram_handle],
    });

    if (existing.rows.length > 0) {
      // 이미 존재 — month·role·category 갱신 (살아있으면 충분)
      const existId = String((existing.rows[0] as Record<string, unknown>).id ?? "");
      await db.execute({
        sql: `UPDATE mezzanine_brands
              SET month = ?, role = ?, category = ?, season = 'all', status = 'MANUAL_VERIFIED'
              WHERE id = ?`,
        args: [b.month, b.role, b.category, existId],
      });
      log.push(`UPDATED  ${b.name} (${existId})`);
      skipped++;
    } else {
      // 신규 삽입
      const id = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO mezzanine_brands
                (id, name, instagram_handle, category, dong, season, month, role,
                 followers, popup_count, region, source_type, core_info, dynamic_filters,
                 matrix_x, matrix_y, gemini_reason, contact_status, status, url, verified_at)
              VALUES (?, ?, ?, ?, 'TBD', 'all', ?, ?, 0, 0, '서울', 'MANUAL', '{}', '{}',
                      50, 50, '', 'untouched', 'MANUAL_VERIFIED', '', datetime('now'))`,
        args: [id, b.name, b.instagram_handle, b.category, b.month, b.role],
      });
      log.push(`INSERTED ${b.name} (${id})`);
      inserted++;
    }
  }

  return NextResponse.json({ ok: true, inserted, skipped, total: JUNE_BRANDS.length, log });
}
