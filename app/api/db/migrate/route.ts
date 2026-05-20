import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    await db.executeMultiple(`
      ALTER TABLE sellfit_daily_reports ADD COLUMN defended_amount INTEGER DEFAULT 0;
      ALTER TABLE sellfit_daily_reports ADD COLUMN actions_completed INTEGER DEFAULT 0;
      ALTER TABLE sellfit_daily_reports ADD COLUMN full_analysis TEXT;
      ALTER TABLE sellfit_daily_reports ADD COLUMN action_log TEXT DEFAULT '[]';
      ALTER TABLE sellfit_daily_reports ADD COLUMN consecutive_days INTEGER DEFAULT 1;
    `);
    return NextResponse.json({ ok: true, message: "마이그레이션 완료" });
  } catch (e) {
    // 이미 컬럼 있으면 무시
    return NextResponse.json({ ok: true, message: "이미 적용됨", detail: String(e) });
  }
}
