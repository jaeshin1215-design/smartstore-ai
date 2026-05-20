import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// 상품 목록 조회
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  const result = await db.execute({
    sql: "SELECT * FROM sellfit_products WHERE store_id = ? ORDER BY is_own DESC, created_at ASC",
    args: [storeId],
  });
  return NextResponse.json({ products: result.rows });
}

// 상품 등록
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_id, name, url, keyword, category, price, is_own } = body;

  if (!store_id || !name || !keyword || !category) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO sellfit_products (id, store_id, name, url, keyword, category, price, is_own)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, store_id, name, url || null, keyword, category,
           price ? Number(price) : null, is_own ? 1 : 0],
  });

  return NextResponse.json({ ok: true, id });
}

// 상품 삭제
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  await db.execute({ sql: "DELETE FROM sellfit_products WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
