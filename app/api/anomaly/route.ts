import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/auth";
import { db } from "@/lib/db";
import { isolationForest } from "@/lib/isolationForest";

export async function GET(req: NextRequest) {
  const store_id = await resolveStoreId(req, req.nextUrl.searchParams.get("store_id"));
  const contamination = parseFloat(req.nextUrl.searchParams.get("contamination") ?? "0.05");

  if (!store_id) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const res = await db.execute({
    sql: "SELECT id, name, matrix_x, matrix_y, price, purchase_price FROM sellfit_products WHERE store_id = ?",
    args: [store_id],
  });

  const products = res.rows;
  if (products.length === 0) return NextResponse.json({ anomalyIds: [], scores: [] });

  // Feature: [마진율(0~100), 판매량(0~99), 가격변동폭(0 — events 비어있을 때)]
  const data = products.map(p => {
    const price    = Number(p.price) || 0;
    const cost     = Number(p.purchase_price) || 0;
    const margin   = price > 0 ? (price - cost) / price * 100 : 0;
    const sales    = Number(p.matrix_x) || 0;
    const variance = 0; // sellfit_events 쌓이면 자동 반영
    return [margin, sales, variance];
  });

  const results = isolationForest(data, Math.min(Math.max(contamination, 0.01), 0.3));
  const anomalyIds = results.filter(r => r.isAnomaly).map(r => String(products[r.index].id));
  const scores     = results.map(r => ({ id: String(products[r.index].id), score: r.score }));

  return NextResponse.json({ anomalyIds, scores });
}
