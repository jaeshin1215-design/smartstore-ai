import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  const result = await db.execute({
    sql: "SELECT * FROM sellfit_competitor_tracking WHERE store_id = ? ORDER BY check_date DESC, created_at DESC LIMIT 200",
    args: [storeId],
  });
  return NextResponse.json({ records: result.rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_id, product_name, coupang_price, is_item_winner, check_date } = body;

  if (!store_id || !product_name || !check_date) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO sellfit_competitor_tracking (id, store_id, product_name, coupang_price, is_item_winner, check_date) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, store_id, product_name, coupang_price ? Number(coupang_price) : null, is_item_winner ? 1 : 0, check_date],
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  await db.execute({ sql: "DELETE FROM sellfit_competitor_tracking WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
