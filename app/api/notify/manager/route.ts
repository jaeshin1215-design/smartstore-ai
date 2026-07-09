export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coupangMarginPct, judgeMargin, kstToday } from "@/lib/priceguard";

const CRON_SECRET = process.env.CRON_SECRET;
const MANAGER_PHONE = process.env.NOTIFY_MANAGER_PHONE!;
const SOLAPI_KEY = process.env.SOLAPI_API_KEY!;
const SOLAPI_SECRET = process.env.SOLAPI_API_SECRET!;
const SENDER = process.env.SOLAPI_SENDER!;

import crypto from "crypto";

function makeSolapiAuth() {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).slice(2, 18);
  const signature = crypto
    .createHmac("sha256", SOLAPI_SECRET)
    .update(date + salt)
    .digest("hex");
  return { date, salt, signature };
}

async function sendSMS(to: string, text: string) {
  const { date, salt, signature } = makeSolapiAuth();
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `HMAC-SHA256 apiKey=${SOLAPI_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({
      message: { to, from: SENDER, text },
    }),
  });
  return res.ok;
}

// 패턴 자동 라우팅 A~E
function detectPattern(report: Record<string, unknown>, history: unknown[]): string {
  const riskScore = Number(report.risk_score || 0);
  const hasHistory = history.length > 0;

  // E: 시즌 전환 (3,4,5,9,10월)
  const month = new Date().getMonth() + 1;
  if ([3, 4, 5, 9, 10].includes(month)) return "E";

  // D: 어제 작업 이력 있음
  if (hasHistory) return "D";

  // B: 비상 2개 이상
  if (riskScore >= 70) return "B";

  // C: 기회 2개 이상, 비상 0
  if (riskScore < 30) return "C";

  // A: 기본
  return "A";
}

// Price Guard: 오늘 캡처 기준 위험 상품 수 (테이블 미생성 등 오류 시 0)
async function countPriceDanger(storeId: string): Promise<number> {
  try {
    const prods = await db.execute({
      sql: "SELECT id, purchase_price, margin_warn_pct, margin_danger_pct FROM sellfit_products WHERE store_id = ?",
      args: [storeId],
    });
    const caps = await db.execute({
      sql: "SELECT product_id, price FROM sellfit_price_captures WHERE store_id = ? AND check_date = ? ORDER BY captured_at ASC",
      args: [storeId, kstToday()],
    });
    const latest = new Map<string, number>();
    for (const c of caps.rows) {
      if (c.product_id) latest.set(String(c.product_id), Number(c.price));
    }
    let danger = 0;
    for (const p of prods.rows) {
      const price = latest.get(String(p.id));
      if (price == null) continue;
      const margin = coupangMarginPct(price, p.purchase_price != null ? Number(p.purchase_price) : null);
      const level = judgeMargin(
        margin,
        p.margin_warn_pct != null ? Number(p.margin_warn_pct) : null,
        p.margin_danger_pct != null ? Number(p.margin_danger_pct) : null
      );
      if (level === "위험") danger++;
    }
    return danger;
  } catch {
    return 0;
  }
}

function buildManagerMessage(
  pattern: string,
  report: Record<string, unknown>,
  today: string,
  history: unknown[],
  priceDanger: number
): string {
  const riskScore = Number(report.risk_score || 0);
  const title1 = String(report.recommended_title_1 || "");
  const hookingCopy = String(report.hooking_copy || "");

  let summary = String(report.summary || "");
  try {
    const parsed = JSON.parse(summary);
    summary = parsed.brief || summary;
  } catch { /* 그대로 */ }

  const riskEmoji = riskScore >= 70 ? "🔴" : riskScore >= 50 ? "🟡" : "🟢";

  const priceGuardLine = priceDanger > 0 ? `🛡 오늘 가격 위험 ${priceDanger}건, 확인하세요 (가격 추적 탭)\n` : "";
  const baseHeader = `[SellFit] ${today} 이다슬 님 퀘스트\n${riskEmoji} 위험도 ${riskScore}점\n${priceGuardLine}\n`;

  const quests = [
    title1 ? `⚡ 상품명 수정 (5분)\n"${title1}"` : "",
    hookingCopy ? `⚡ 후킹 카피 등록 (3분)\n"${hookingCopy}"` : "",
    "⚡ SellFit 비교 탭 확인 (2분)",
  ].filter(Boolean);

  const questText = quests.slice(0, 3).join("\n\n");

  const patterns: Record<string, string> = {
    A: `${baseHeader}오늘 진단:\n${summary}\n\n오늘 퀘스트:\n${questText}\n\n📱 sellfit.kr?tab=compare`,
    B: `${baseHeader}🚨 비상 상황\n${summary}\n\n즉시 처리:\n${questText}\n\n📱 sellfit.kr?tab=compare`,
    C: `${baseHeader}🌱 기회 포착\n${summary}\n\n선점 액션:\n${questText}\n\n📱 sellfit.kr?tab=compare`,
    D: `${baseHeader}어제 작업 결과 반영됨\n${summary}\n\n오늘 다음 단계:\n${questText}\n\n📱 sellfit.kr?tab=compare`,
    E: `${baseHeader}📅 시즌 전환 감지\n${summary}\n\n시즌 대응:\n${questText}\n\n📱 sellfit.kr?tab=compare`,
  };

  return (patterns[pattern] || patterns.A).slice(0, 1000);
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 토·일 발송 X
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600000);
  const day = kst.getDay();
  if (day === 0 || day === 6) {
    return NextResponse.json({ ok: true, skipped: "weekend" });
  }

  const today = kst.toISOString().slice(0, 10);

  const storeResult = await db.execute("SELECT * FROM sellfit_stores LIMIT 1");
  if (storeResult.rows.length === 0) return NextResponse.json({ error: "스토어 없음" }, { status: 400 });
  const store = storeResult.rows[0];

  const reportResult = await db.execute({
    sql: "SELECT * FROM sellfit_daily_reports WHERE store_id = ? AND report_date = ?",
    args: [String(store.id), today],
  });

  const historyResult = await db.execute({
    sql: "SELECT * FROM sellfit_daily_reports WHERE store_id = ? AND report_date < ? ORDER BY report_date DESC LIMIT 3",
    args: [String(store.id), today],
  });

  const report = (reportResult.rows[0] || {}) as Record<string, unknown>;
  const history = historyResult.rows;

  const pattern = detectPattern(report, history);
  const priceDanger = await countPriceDanger(String(store.id));
  const message = buildManagerMessage(pattern, report, today, history, priceDanger);

  let smsSent = false;
  if (MANAGER_PHONE) {
    smsSent = await sendSMS(MANAGER_PHONE, message);
  }

  return NextResponse.json({ ok: true, pattern, sms_sent: smsSent, today });
}
