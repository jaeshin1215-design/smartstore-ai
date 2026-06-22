import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// v5: 노크콤마 중복 제거 + MANUAL 등록 브랜드 status 보정 (ai_draft → MANUAL_VERIFIED)
export async function POST() {
  const log: string[] = [];

  try {
    // 1. 핸들별 중복 rows 조회 후 최신 1건만 보존, 나머지 삭제
    const dupes = await db.execute(`
      SELECT instagram_handle, COUNT(*) as cnt, MIN(created_at) as oldest
      FROM mezzanine_brands
      WHERE instagram_handle != ''
      GROUP BY instagram_handle
      HAVING COUNT(*) > 1
    `);

    for (const row of dupes.rows as Record<string, unknown>[]) {
      const handle = String(row.instagram_handle ?? "");
      const del = await db.execute({
        sql: `DELETE FROM mezzanine_brands
              WHERE instagram_handle = ?
                AND id NOT IN (
                  SELECT id FROM mezzanine_brands
                  WHERE instagram_handle = ?
                  ORDER BY created_at DESC
                  LIMIT 1
                )`,
        args: [handle, handle],
      });
      log.push(`중복 삭제 [${handle}]: ${del.rowsAffected ?? 0}건`);
    }

    // 2. source_type=MANUAL인데 ai_draft로 잘못 저장된 레코드 보정
    const fix = await db.execute(`
      UPDATE mezzanine_brands
      SET status = 'MANUAL_VERIFIED'
      WHERE source_type = 'MANUAL' AND (status = 'ai_draft' OR status IS NULL)
    `);
    log.push(`✅ MANUAL→MANUAL_VERIFIED 보정: ${fix.rowsAffected ?? 0}건`);

  } catch (e) {
    log.push(`⚠️ 오류: ${String(e)}`);
  }

  return NextResponse.json({ ok: true, log });
}
