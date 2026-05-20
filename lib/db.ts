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
}
