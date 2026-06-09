import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
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
    return NextResponse.json({ ok: true, message: "mezzanine_brands 테이블 생성 완료" });
  } catch (e) {
    return NextResponse.json({ ok: true, message: "이미 존재하거나 완료", detail: String(e) });
  }
}
