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

  // v6 — DB 훅 3개 (소급 불가 데이터 기반)
  // 훅 1: daily_metrics에 product_id 는 이미 존재, daily_reports에 product_id 연결용 컬럼 추가
  await runSafe("ALTER TABLE sellfit_daily_reports ADD COLUMN product_id TEXT");

  // 훅 2: 고객 구매 이력 테이블 (K-Means 고객세분화 기반)
  await runSafe(`CREATE TABLE IF NOT EXISTS sellfit_customer_orders (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    order_no TEXT,
    channel TEXT,
    quantity INTEGER DEFAULT 1,
    amount INTEGER,
    order_date TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  // 훅 3: 가격·광고비·프로모션 변경 이력 (다이내믹프라이싱 학습 기반)
  await runSafe(`CREATE TABLE IF NOT EXISTS sellfit_events (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    product_id TEXT,
    event_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    note TEXT,
    event_date TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  // v7 — 매트릭스 스냅샷 (2개월·7개월 예측 정확도 검증용)
  await runSafe(`CREATE TABLE IF NOT EXISTS sellfit_matrix_snapshots (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT,
    quadrant TEXT,
    predicted_action TEXT,
    matrix_x REAL,
    matrix_y REAL,
    snapshot_date TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  // v8 — Price Guard: 쿠팡 URL·상품별 마진 임계값 + 가격 수집 원천 테이블
  // 원천(측정)과 판정(파생) 분리 — 판정은 조회 시 계산 (임계값 변경이 과거에도 소급 적용)
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN coupang_url TEXT");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN coupang_product_id TEXT");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN margin_warn_pct REAL");
  await runSafe("ALTER TABLE sellfit_products ADD COLUMN margin_danger_pct REAL");
  await runSafe(`CREATE TABLE IF NOT EXISTS sellfit_price_captures (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    product_id TEXT,
    coupang_product_id TEXT,
    price INTEGER NOT NULL,
    is_ad INTEGER DEFAULT 0,
    is_item_winner INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    check_date TEXT NOT NULL,
    captured_at TEXT DEFAULT (datetime('now'))
  )`);
  await runSafe("CREATE INDEX IF NOT EXISTS idx_price_captures_store_date ON sellfit_price_captures (store_id, check_date)");

  return NextResponse.json({ ok: true, message: "마이그레이션 완료" });
}
