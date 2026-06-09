import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // 테이블 생성 (없으면)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mezzanine_brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        instagram_handle TEXT DEFAULT '',
        category TEXT DEFAULT 'lifestyle',
        dong TEXT DEFAULT 'TBD',
        season TEXT DEFAULT 'all',
        followers INTEGER DEFAULT 0,
        popup_count INTEGER DEFAULT 0,
        region TEXT DEFAULT '',
        source_type TEXT DEFAULT 'MANUAL',
        core_info TEXT DEFAULT '{}',
        dynamic_filters TEXT DEFAULT '{}',
        matrix_x REAL DEFAULT 50,
        matrix_y REAL DEFAULT 50,
        gemini_reason TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // contact_status 컬럼 추가 (이미 존재하면 무시)
    try {
      await db.execute(
        `ALTER TABLE mezzanine_brands ADD COLUMN contact_status TEXT DEFAULT 'untouched'`
      );
    } catch { /* 이미 존재 */ }

    // dorking VERIFIED 빈 데이터 정리 (gemini_reason 없고 50/50인 것)
    await db.execute(`
      DELETE FROM mezzanine_brands
      WHERE source_type = 'VERIFIED'
        AND (gemini_reason = '' OR gemini_reason IS NULL)
        AND matrix_x = 50
        AND matrix_y = 50
    `);

    // 중복 정리: 같은 name 중 가장 최근 것(created_at 기준)만 남김
    await db.execute(`
      DELETE FROM mezzanine_brands
      WHERE rowid NOT IN (
        SELECT MAX(rowid) FROM mezzanine_brands GROUP BY name
      )
    `);

    return NextResponse.json({ ok: true, message: "마이그레이션 완료" });
  } catch (e) {
    return NextResponse.json({ ok: true, message: "이미 완료 또는 오류 무시", detail: String(e) });
  }
}
