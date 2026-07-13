import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { extractCoupangProductId, normalizeCoupangUrl } from "@/lib/priceguard";
import { resolveStoreId } from "@/lib/auth";

// 스토어 스코핑 (2026-07-14): 클라이언트가 보낸 store_id를 신뢰하지 않는다.
// 모든 핸들러가 세션의 store_id를 강제하고, 변이(PATCH/DELETE)는 소유권(WHERE store_id)까지 잠근다.

// 상품 목록 조회
export async function GET(req: NextRequest) {
  const storeId = await resolveStoreId(req, req.nextUrl.searchParams.get("store_id"));
  if (!storeId) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const result = await db.execute({
    sql: "SELECT * FROM sellfit_products WHERE store_id = ? ORDER BY is_own DESC, created_at ASC",
    args: [storeId],
  });
  return NextResponse.json({ products: result.rows });
}

// 상품 등록 (Discover 채널확정 포함)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, keyword, category, price, purchase_price, shipping_cost, stock, is_own, matrix_x, matrix_y, coupang_url } = body;
  // 클라이언트 body의 store_id는 무시 — 세션의 store_id 강제 (2026-07-14)
  const store_id = await resolveStoreId(req, body.store_id ?? null);
  if (!store_id) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  if (!name || !keyword || !category) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO sellfit_products (id, store_id, name, url, keyword, category, price, purchase_price, shipping_cost, stock, is_own, matrix_x, matrix_y, coupang_url, coupang_product_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, store_id, name, url || null, keyword, category,
           price ? Number(price) : null,
           purchase_price ? Number(purchase_price) : null,
           shipping_cost ? Number(shipping_cost) : null,
           stock != null && stock !== "" ? Number(stock) : null,
           is_own !== undefined && is_own !== null ? Number(is_own) : 0,
           matrix_x != null ? Number(matrix_x) : null,
           matrix_y != null ? Number(matrix_y) : null,
           normalizeCoupangUrl(coupang_url),
           extractCoupangProductId(coupang_url)],
  });

  return NextResponse.json({ ok: true, id });
}

// 상품 정보 수정 (PATCH)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, matrix_x, matrix_y, price, is_price_confirmed, coupang_url } = body;

  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  // 소유권 검증 — 세션 스토어의 상품만 수정 가능 (2026-07-14)
  const sessionStoreId = await resolveStoreId(req, null);
  if (!sessionStoreId) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

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
  if (coupang_url !== undefined) {
    const normalized = normalizeCoupangUrl(coupang_url);
    // 값이 들어왔는데 쿠팡 주소로 정규화 안 되면 조용히 null 저장 금지 → 400 (2026-07-10)
    const provided = typeof coupang_url === "string" && coupang_url.trim() !== "";
    if (provided && !normalized) {
      return NextResponse.json({ error: "쿠팡 상품 주소가 아닙니다" }, { status: 400 });
    }
    fields.push("coupang_url = ?", "coupang_product_id = ?");
    args.push(normalized, extractCoupangProductId(coupang_url));
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "수정할 항목 없음" }, { status: 400 });
  }

  args.push(id, sessionStoreId);
  const result = await db.execute({
    sql: `UPDATE sellfit_products SET ${fields.join(", ")} WHERE id = ? AND store_id = ?`,
    args,
  });

  // 0행 업데이트도 성공으로 반환하던 조용한 실패 제거 (2026-07-10)
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

// 상품 삭제
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  // 소유권 검증 — 세션 스토어의 상품만 삭제 가능 (2026-07-14)
  const sessionStoreId = await resolveStoreId(req, null);
  if (!sessionStoreId) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  await db.execute({ sql: "DELETE FROM sellfit_products WHERE id = ? AND store_id = ?", args: [id, sessionStoreId] });
  return NextResponse.json({ ok: true });
}
