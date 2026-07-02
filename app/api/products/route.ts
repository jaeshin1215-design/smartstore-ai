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

// 상품 등록 (Discover 채널확정 포함)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_id, name, url, keyword, category, price, purchase_price, shipping_cost, is_own, matrix_x, matrix_y } = body;

  if (!store_id || !name || !keyword || !category) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO sellfit_products (id, store_id, name, url, keyword, category, price, purchase_price, shipping_cost, is_own, matrix_x, matrix_y)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, store_id, name, url || null, keyword, category,
           price ? Number(price) : null,
           purchase_price ? Number(purchase_price) : null,
           shipping_cost ? Number(shipping_cost) : null,
           is_own !== undefined && is_own !== null ? Number(is_own) : 0,
           matrix_x != null ? Number(matrix_x) : null,
           matrix_y != null ? Number(matrix_y) : null],
  });

  return NextResponse.json({ ok: true, id });
}

// 상품 정보 수정 (PATCH)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, matrix_x, matrix_y, price, is_price_confirmed } = body;

  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const fields: string[] = [];
  const args: any[] = [];

  if (matrix_x !== undefined) {
    fields.push("matrix_x = ?");
    args.push(matrix_x);
  }
  if (matrix_y !== undefined) {
    fields.push("matrix_y = ?");
    args.push(matrix_y);
  }
  if (price !== undefined) {
    fields.push("price = ?");
    args.push(price ? Number(price) : null);
  }
  if (is_price_confirmed !== undefined) {
    fields.push("is_price_confirmed = ?");
    args.push(is_price_confirmed);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "수정할 항목 없음" }, { status: 400 });
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE sellfit_products SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ ok: true });
}

// 상품 삭제
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  await db.execute({ sql: "DELETE FROM sellfit_products WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
