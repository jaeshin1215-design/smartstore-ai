export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/auth";
import { db } from "@/lib/db";

// 오늘의 진단 조회
export async function GET(req: NextRequest) {
  const storeId = await resolveStoreId(req, req.nextUrl.searchParams.get("store_id"));
  if (!storeId) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

  // 오늘 리포트
  const reportResult = await db.execute({
    sql: "SELECT * FROM sellfit_daily_reports WHERE store_id = ? AND report_date = ?",
    args: [storeId, today],
  });

  // 누적 방어액 + 완료 액션 수
  const totalsResult = await db.execute({
    sql: `SELECT
            COALESCE(SUM(defended_amount), 0) AS total_defended,
            COALESCE(SUM(actions_completed), 0) AS total_actions,
            COUNT(*) AS total_days
          FROM sellfit_daily_reports
          WHERE store_id = ?`,
    args: [storeId],
  });

  // 최근 7일 이력
  const historyResult = await db.execute({
    sql: `SELECT report_date, risk_score, summary, defended_amount, actions_completed, status
          FROM sellfit_daily_reports
          WHERE store_id = ?
          ORDER BY report_date DESC
          LIMIT 7`,
    args: [storeId],
  });

  const report = reportResult.rows[0] || null;
  const totals = totalsResult.rows[0];
  const history = historyResult.rows;

  // full_analysis 파싱
  let fullAnalysis = null;
  if (report?.full_analysis) {
    try { fullAnalysis = JSON.parse(String(report.full_analysis)); } catch { /* 무시 */ }
  } else if (report?.summary) {
    try {
      const parsed = JSON.parse(String(report.summary));
      if (parsed.full) fullAnalysis = parsed.full;
    } catch { /* 무시 */ }
  }

  return NextResponse.json({
    today,
    report,
    full_analysis: fullAnalysis,
    totals: {
      defended: Number(totals?.total_defended || 0),
      actions: Number(totals?.total_actions || 0),
      days: Number(totals?.total_days || 0),
    },
    history,
  });
}

// 액션 완료 처리
export async function PATCH(req: NextRequest) {
  const { report_id, defended_amount } = await req.json();
  if (!report_id) return NextResponse.json({ error: "report_id 필요" }, { status: 400 });
  const sessionStoreId = await resolveStoreId(req, null); // 소유권 검증 (2026-07-14)
  if (!sessionStoreId) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const amount = Number(defended_amount) || 0;
  await db.execute({
    sql: `UPDATE sellfit_daily_reports
          SET actions_completed = actions_completed + 1,
              defended_amount = defended_amount + ?
          WHERE id = ? AND store_id = ?`,
    args: [amount, report_id, sessionStoreId],
  });

  // 업데이트된 누적값 반환
  const reportResult = await db.execute({
    sql: "SELECT store_id FROM sellfit_daily_reports WHERE id = ?",
    args: [report_id],
  });
  const storeId = String(reportResult.rows[0]?.store_id || "");

  const totalsResult = await db.execute({
    sql: `SELECT COALESCE(SUM(defended_amount), 0) AS total_defended,
                 COALESCE(SUM(actions_completed), 0) AS total_actions
          FROM sellfit_daily_reports WHERE store_id = ?`,
    args: [storeId],
  });

  return NextResponse.json({
    ok: true,
    total_defended: Number(totalsResult.rows[0]?.total_defended || 0),
    total_actions: Number(totalsResult.rows[0]?.total_actions || 0),
  });
}
