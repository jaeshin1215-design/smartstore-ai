import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// 매트릭스 스냅샷 저장 (월 1회 — 예측 정확도 검증용)
export async function POST(req: NextRequest) {
  const { store_id, date, items } = await req.json() as {
    store_id: string;
    date: string;
    items: {
      product_id: string;
      product_name: string;
      matrix_x: number;
      matrix_y: number;
      quadrant: string;
      predicted_action: string;
    }[];
  };

  if (!store_id || !date || !items?.length) {
    return NextResponse.json({ error: "store_id·date·items 필요" }, { status: 400 });
  }

  // 같은 날짜 중복 방지: 오늘 저장된 스냅샷이 있으면 스킵
  const existing = await db.execute({
    sql: "SELECT id FROM sellfit_matrix_snapshots WHERE store_id = ? AND snapshot_date = ? LIMIT 1",
    args: [store_id, date],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "이미 오늘 스냅샷이 존재합니다" });
  }

  for (const item of items) {
    await db.execute({
      sql: `INSERT INTO sellfit_matrix_snapshots
            (id, store_id, product_id, product_name, quadrant, predicted_action, matrix_x, matrix_y, snapshot_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), store_id, item.product_id, item.product_name, item.quadrant, item.predicted_action, item.matrix_x, item.matrix_y, date],
    });
  }

  return NextResponse.json({ ok: true, saved: items.length });
}

// 스냅샷 조회 (검증 시 사용)
export async function GET(req: NextRequest) {
  const store_id = req.nextUrl.searchParams.get("store_id");
  const date = req.nextUrl.searchParams.get("date");
  if (!store_id) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  const sql = date
    ? "SELECT * FROM sellfit_matrix_snapshots WHERE store_id = ? AND snapshot_date = ? ORDER BY product_name"
    : "SELECT * FROM sellfit_matrix_snapshots WHERE store_id = ? ORDER BY snapshot_date DESC, product_name";
  const args = date ? [store_id, date] : [store_id];

  const result = await db.execute({ sql, args });
  return NextResponse.json({ snapshots: result.rows });
}
