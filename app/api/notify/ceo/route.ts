export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

const CRON_SECRET = process.env.CRON_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

const CEO_PHONE = process.env.NOTIFY_CEO_PHONE!;
const CEO_EMAIL = process.env.NOTIFY_CEO_EMAIL;
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

const DAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

function getWeeklyContent(day: number): string {
  const contents: Record<number, string> = {
    1: "📊 이번 주 트렌드 예측: 압축팩 검색량 지속 상승 중. 주간 선점 타이밍.",
    2: "🔍 경쟁사 동향: 어제 수집 데이터 기반 경쟁사 변화 감지.",
    3: "💡 광고 ROI 점검: 현재 CPC 대비 전환율 분석 완료.",
    4: "🌱 신규 기회: DataLab 급상승 키워드 발견.",
    5: "🛡️ 주말 방어 가이드: 주말 검색량 대비 상품 최적화 체크.",
  };
  return contents[day] || "";
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 토·일 발송 X
  const now = new Date();
  const kstHour = new Date(now.getTime() + 9 * 3600000);
  const day = kstHour.getDay();
  if (day === 0 || day === 6) {
    return NextResponse.json({ ok: true, skipped: "weekend" });
  }

  const today = kstHour.toISOString().slice(0, 10);

  // 이지스토리 리포트 조회
  const storeResult = await db.execute("SELECT * FROM sellfit_stores LIMIT 1");
  if (storeResult.rows.length === 0) return NextResponse.json({ error: "스토어 없음" }, { status: 400 });
  const store = storeResult.rows[0];

  const reportResult = await db.execute({
    sql: "SELECT * FROM sellfit_daily_reports WHERE store_id = ? AND report_date = ?",
    args: [String(store.id), today],
  });

  const report = reportResult.rows[0];
  const riskScore = report ? Number(report.risk_score) : 0;
  const summary = report ? String(report.summary || "") : "분석 준비 중";
  const title1 = report ? String(report.recommended_title_1 || "") : "";
  const hookingCopy = report ? String(report.hooking_copy || "") : "";

  // 브리핑 요약 파싱
  let briefSummary = summary;
  try {
    const parsed = JSON.parse(summary);
    briefSummary = parsed.brief || summary;
  } catch { /* 그대로 사용 */ }

  const weeklyContent = getWeeklyContent(day);
  const riskEmoji = riskScore >= 70 ? "🔴" : riskScore >= 50 ? "🟡" : "🟢";

  // 카톡 압축 메시지 (빈 대표)
  const smsText = `[SellFit] ${today} 이지스토리 브리핑

${riskEmoji} 위험도 ${riskScore}점

📌 오늘 핵심
${briefSummary}

${title1 ? `✏️ 추천 상품명\n${title1}` : ""}
${hookingCopy ? `\n💬 후킹 카피\n${hookingCopy}` : ""}

${weeklyContent}

📱 sellfit.kr 에서 전체 보고서 확인`;

  const results: Record<string, unknown> = {};

  // SMS 발송 (빈 대표)
  if (CEO_PHONE) {
    results.sms = await sendSMS(CEO_PHONE, smsText.slice(0, 1000));
  }

  // 이메일 발송 (빈 대표) — 이메일 있을 때만
  if (CEO_EMAIL) {
    const emailResult = await resend.emails.send({
      from: "SellFit <noreply@sellfit.kr>",
      to: CEO_EMAIL,
      subject: `[SellFit] ${today} 이지스토리 일일 브리핑 ${riskEmoji}`,
      html: `
<div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <h2 style="color: #0f2a1e; border-bottom: 2px solid #00aa6c; padding-bottom: 12px;">
    이지스토리 일일 브리핑 — ${today} (${DAY_KR[day]}요일)
  </h2>

  <div style="background: #e8f5f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <strong>위험도 ${riskEmoji} ${riskScore}점</strong><br>
    ${briefSummary}
  </div>

  ${title1 ? `
  <h3 style="color: #0f2a1e;">추천 상품명</h3>
  <div style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px;">${title1}</div>
  ` : ""}

  ${hookingCopy ? `
  <h3 style="color: #0f2a1e;">후킹 카피</h3>
  <div style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px;">${hookingCopy}</div>
  ` : ""}

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    ${weeklyContent}
  </div>

  <a href="https://sellfit.kr" style="display: inline-block; background: #0f2a1e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
    전체 보고서 보기 →
  </a>

  <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
    SellFit · Aiges Pontos · 자동 발송됨
  </p>
</div>`,
    });
    results.email = emailResult.data?.id ? "sent" : "failed";
  }

  return NextResponse.json({ ok: true, results, today, risk_score: riskScore });
}
