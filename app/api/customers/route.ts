import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const store_id = await resolveStoreId(req, req.nextUrl.searchParams.get("store_id"));
  if (!store_id) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  // 고객별 집계: avg_order_value, order_count, order_nos, 식별 정보
  const res = await db.execute({
    sql: `SELECT customer_id,
                 MAX(customer_name)                 AS customer_name,
                 MAX(phone_masked)                  AS phone_masked,
                 COUNT(DISTINCT order_no)           AS order_count,
                 CAST(SUM(amount) AS REAL) /
                   COUNT(DISTINCT order_no)         AS avg_order_value,
                 GROUP_CONCAT(DISTINCT order_no)    AS order_nos
          FROM   sellfit_customer_orders
          WHERE  store_id = ?
          GROUP  BY customer_id`,
    args: [store_id],
  });

  if (res.rows.length === 0) {
    return NextResponse.json({ points: [], median_price: 0, sample_count: 0 });
  }

  const points = res.rows.map(r => ({
    customer_id:     String(r.customer_id),
    customer_name:   r.customer_name ? String(r.customer_name) : null,
    phone_masked:    r.phone_masked  ? String(r.phone_masked)  : null,
    order_count:     Number(r.order_count),
    avg_order_value: Math.round(Number(r.avg_order_value)),
    order_nos:       String(r.order_nos ?? "").split(",").filter(Boolean),
  }));

  // 중앙값 산출
  const sorted = [...points].map(p => p.avg_order_value).sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  const median_price = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];

  return NextResponse.json({ points, median_price, sample_count: points.length });
}
