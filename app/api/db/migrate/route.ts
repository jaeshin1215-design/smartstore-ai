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

  // v3 — 경쟁사 추적 (쿠팡 판매가·아이템위너 일별 기록)
  await runSafe(`CREATE TABLE IF NOT EXISTS sellfit_competitor_tracking (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    coupang_price INTEGER,
    is_item_winner INTEGER DEFAULT 0,
    check_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // v4 — 경쟁사 추적: AI 판단 결과 컬럼 추가
  await runSafe("ALTER TABLE sellfit_competitor_tracking ADD COLUMN safety_level TEXT");
  await runSafe("ALTER TABLE sellfit_competitor_tracking ADD COLUMN registered_margin_pct REAL");
  await runSafe("ALTER TABLE sellfit_competitor_tracking ADD COLUMN coupang_margin_pct REAL");
  await runSafe("ALTER TABLE sellfit_competitor_tracking ADD COLUMN margin_diff_pct REAL");
  await runSafe("ALTER TABLE sellfit_competitor_tracking ADD COLUMN winner_target_price INTEGER");
  await runSafe("ALTER TABLE sellfit_competitor_tracking ADD COLUMN judgment_reason TEXT");

  // v5 — stores: PIN 코드 (6자리, 기기 간 스토어 공유)
  await runSafe("ALTER TABLE sellfit_stores ADD COLUMN pin TEXT");

  return NextResponse.json({ ok: true, message: "마이그레이션 완료" });
}
