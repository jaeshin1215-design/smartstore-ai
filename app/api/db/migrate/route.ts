import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function runSafe(sql: string) {
  try { await db.execute(sql); } catch { /* 이미 존재하면 무시 */ }
}

export async function POST() {
  // v1 — daily_reports 확장
  await runSafe("ALTER TABLE sellfit_daily_reports ADD COLUMN defended_amount INTEGER DEFAULT 0");
  await runSafe("ALTER TABLE sellfit_daily_reports ADD COLUMN actions_completed INTEGER DEFAULT 0");
  await runSafe("ALTER TABLE sellfit_daily_reports ADD COLUMN full_analysis TEXT");
  await runSafe("ALTER TABLE sellfit_daily_reports ADD COLUMN action_log TEXT DEFAULT '[]'");
  await runSafe("ALTER TABLE sellfit_daily_reports ADD COLUMN consecutive_days INTEGER DEFAULT 1");

  // v2 — products: 상품 데이터 마스터 (판매가+매입가+배송비 세트) / 5-14 미팅 1순위
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN purchase_price INTEGER");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN shipping_cost INTEGER");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN is_price_confirmed INTEGER DEFAULT 0");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN matrix_x REAL");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN matrix_y REAL");

  return NextResponse.json({ ok: true, message: "마이그레이션 완료" });
}
