import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const log: string[] = [];

  // ── 1. bodycare → wellness (아로마티카 포함 전체 소급)
  const r1 = await db.execute({
    sql: `UPDATE mezzanine_brands SET category = 'wellness' WHERE category = 'bodycare'`,
    args: [],
  });
  log.push(`bodycare → wellness: ${r1.rowsAffected ?? 0}건`);

  // ── 2. lifestyle → wellness (MANUAL_VERIFIED만 — AI draft는 그대로)
  const r2 = await db.execute({
    sql: `UPDATE mezzanine_brands SET category = 'wellness' WHERE category = 'lifestyle' AND status = 'MANUAL_VERIFIED'`,
    args: [],
  });
  log.push(`lifestyle → wellness (MANUAL_VERIFIED): ${r2.rowsAffected ?? 0}건`);

  // ── 3. AI 발굴 후보 month=6 → month=0 (6월 칸에서 제거)
  const r3 = await db.execute({
    sql: `UPDATE mezzanine_brands SET month = 0 WHERE month = 6 AND name LIKE 'AI 발굴 후보%'`,
    args: [],
  });
  log.push(`AI 후보 6월 → 미배정: ${r3.rowsAffected ?? 0}건`);

  return NextResponse.json({
    ok: true,
    bodycare_fixed:    r1.rowsAffected ?? 0,
    lifestyle_fixed:   r2.rowsAffected ?? 0,
    ai_draft_cleared:  r3.rowsAffected ?? 0,
    log,
  });
}
