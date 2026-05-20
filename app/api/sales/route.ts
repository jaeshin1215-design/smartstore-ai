import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// 테이블 생성
async function ensureTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sellfit_daily_sales (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        sale_date TEXT NOT NULL,
        revenue INTEGER,
        ad_cost INTEGER,
        action_result TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);
  } catch { /* 이미 있으면 무시 */ }
}

// 최근 매출 조회
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  await ensureTable();

  const result = await db.execute({
    sql: `SELECT * FROM sellfit_daily_sales WHERE store_id = ?
          ORDER BY sale_date DESC LIMIT 7`,
    args: [storeId],
  });

  return NextResponse.json({ sales: result.rows });
}

// 매출 입력
export async function POST(req: NextRequest) {
  const { store_id, revenue, ad_cost, action_result } = await req.json();
  if (!store_id) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  await ensureTable();

  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

  // 오늘 이미 있으면 UPDATE
  const existing = await db.execute({
    sql: "SELECT id FROM sellfit_daily_sales WHERE store_id = ? AND sale_date = ?",
    args: [store_id, today],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE sellfit_daily_sales
            SET revenue = ?, ad_cost = ?, action_result = ?
            WHERE store_id = ? AND sale_date = ?`,
      args: [revenue ?? null, ad_cost ?? null, action_result ?? null, store_id, today],
    });
    return NextResponse.json({ ok: true, updated: true });
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO sellfit_daily_sales (id, store_id, sale_date, revenue, ad_cost, action_result)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, store_id, today, revenue ?? null, ad_cost ?? null, action_result ?? null],
  });

  return NextResponse.json({ ok: true, id });
}
