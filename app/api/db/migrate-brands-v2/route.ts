import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const log: string[] = [];

  const tryAlter = async (sql: string, label: string) => {
    try { await db.execute(sql); log.push(`✅ ${label}`); }
    catch { log.push(`⏭ ${label} already exists`); }
  };

  // 1. mezzanine_brands 컬럼 추가
  await tryAlter(`ALTER TABLE mezzanine_brands ADD COLUMN status TEXT DEFAULT 'ai_draft'`, "brands.status");
  await tryAlter(`ALTER TABLE mezzanine_brands ADD COLUMN url TEXT DEFAULT ''`, "brands.url");
  await tryAlter(`ALTER TABLE mezzanine_brands ADD COLUMN area_sqm REAL DEFAULT 0`, "brands.area_sqm");
  await tryAlter(`ALTER TABLE mezzanine_brands ADD COLUMN area_confirmed INTEGER DEFAULT 0`, "brands.area_confirmed");

  // 2. contact_events 테이블 (append-only moat — INSERT만, UPDATE/DELETE 금지)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contact_events (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  log.push("✅ contact_events table");

  // 3. 기존 MANUAL source_type → MANUAL_VERIFIED 백필
  await db.execute(`
    UPDATE mezzanine_brands
    SET status = 'MANUAL_VERIFIED'
    WHERE source_type = 'MANUAL'
      AND (status IS NULL OR status = 'ai_draft')
      AND gemini_reason != ''
      AND gemini_reason IS NOT NULL
  `);
  log.push("✅ backfill: MANUAL+analyzed → MANUAL_VERIFIED");

  return NextResponse.json({ ok: true, log });
}
