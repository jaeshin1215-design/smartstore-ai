import { createClient } from "@libsql/client";

const url = process.env.TURSO_URL!;
const authToken = process.env.TURSO_TOKEN!;

export const db = createClient({ url, authToken });

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sellfit_stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      kakao TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sellfit_products (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      keyword TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER,
      is_own INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sellfit_daily_metrics (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      collected_at INTEGER DEFAULT (unixepoch()),
      price INTEGER,
      review_count INTEGER,
      rating REAL,
      search_volume INTEGER,
      cpc INTEGER,
      competitors INTEGER
    );

    CREATE TABLE IF NOT EXISTS sellfit_daily_reports (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      report_date TEXT NOT NULL,
      risk_score INTEGER DEFAULT 0,
      summary TEXT,
      recommended_title_1 TEXT,
      recommended_title_2 TEXT,
      recommended_title_3 TEXT,
      hooking_copy TEXT,
      review_rebuttal TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // 컬럼 추가 마이그레이션 — 이미 있으면 무시
  const migrations = [
    "ALTER TABLE sellfit_products ADD COLUMN purchase_price INTEGER",
    "ALTER TABLE sellfit_products ADD COLUMN shipping_cost INTEGER",
    "ALTER TABLE sellfit_products ADD COLUMN stock INTEGER",
    "ALTER TABLE sellfit_products ADD COLUMN matrix_x REAL",
    "ALTER TABLE sellfit_products ADD COLUMN matrix_y REAL",
    "ALTER TABLE sellfit_products ADD COLUMN is_price_confirmed INTEGER DEFAULT 0",
    // 고객 식별 재설계 (2026-07-05): 해시 대신 이름 평문 + 마스킹 저장
    "ALTER TABLE sellfit_customer_orders ADD COLUMN customer_name TEXT",
    "ALTER TABLE sellfit_customer_orders ADD COLUMN phone_masked TEXT",
    "ALTER TABLE sellfit_customer_orders ADD COLUMN address_masked TEXT",
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch { /* 이미 존재 */ }
  }
}
