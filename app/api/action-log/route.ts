import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { report_id, action_type, product_name, category } = await req.json();
  if (!report_id) return NextResponse.json({ error: "report_id 필요" }, { status: 400 });

  const entry = { action_type, product_name, category, ts: new Date().toISOString() };

  // 기존 action_log 가져와서 추가
  const result = await db.execute({
    sql: "SELECT action_log FROM sellfit_daily_reports WHERE id = ?",
    args: [report_id],
  });
  const existing = result.rows[0];
  let log: unknown[] = [];
  try { log = JSON.parse(String(existing?.action_log || "[]")); } catch { log = []; }
  log.push(entry);

  await db.execute({
    sql: "UPDATE sellfit_daily_reports SET action_log = ? WHERE id = ?",
    args: [JSON.stringify(log), report_id],
  });

  return NextResponse.json({ ok: true, total_actions: log.length });
}
