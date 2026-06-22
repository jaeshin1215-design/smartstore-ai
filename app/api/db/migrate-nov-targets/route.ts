import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const r = await db.execute({
    sql: `UPDATE mezzanine_brands
          SET category = 'food_gift'
          WHERE month = 11
            AND role = 'target'
            AND status = 'MANUAL_VERIFIED'
            AND category = 'ip_content'`,
    args: [],
  });

  return NextResponse.json({
    ok: true,
    updated: r.rowsAffected ?? 0,
    message: `11월 타깃 ${r.rowsAffected ?? 0}개: ip_content → food_gift`,
  });
}
