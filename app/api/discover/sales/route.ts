import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// product_name 키워드로 heatmap 4개 카테고리 판매량 집계
const KW_MAP: Record<string, string[]> = {
  압축팩: ["압축"],
  다리미판: ["다리미"],
  화분: ["화분"],
  유아매트: ["유아매트"],
};

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ sales: {} });
  try {
    const res = await db.execute({
      sql: `SELECT product_name, SUM(quantity) as qty
            FROM sellfit_customer_orders
            WHERE store_id=?
            GROUP BY product_name`,
      args: [storeId],
    });
    const sales: Record<string, number> = {};
    for (const [cat, kws] of Object.entries(KW_MAP)) {
      sales[cat] = res.rows
        .filter(r => kws.some(kw => String(r.product_name ?? "").includes(kw)))
        .reduce((s, r) => s + (Number(r.qty) || 0), 0);
    }
    return NextResponse.json({ sales });
  } catch {
    return NextResponse.json({ sales: {} });
  }
}
