export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const SHEETS_WEBHOOK = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const ADMIN_EMAIL = process.env.TRIAL_ADMIN_EMAIL ?? "sellfit.official@gmail.com";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 주소가 아닙니다." }, { status: 400 });
  }

  const results = await Promise.allSettled([
    // 1. 구글 시트 저장 (웹훅 URL이 설정된 경우)
    SHEETS_WEBHOOK
      ? fetch(SHEETS_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "trial_button", createdAt: new Date().toISOString() }),
        })
      : Promise.resolve(null),

    // 2. 관리자 알림 이메일
    (async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "SellFit <noreply@sellfit.kr>",
        to: ADMIN_EMAIL,
        subject: `[SellFit] 새 무료 체험 신청 — ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
            <h2 style="color:#0f2a1e;margin-bottom:8px;">🎉 새 무료 체험 신청</h2>
            <p style="color:#6b7280;margin-bottom:24px;">SellFit 7일 무료 체험 신청이 들어왔습니다.</p>
            <div style="background:#f7faf9;border-radius:12px;padding:20px 24px;border:1px solid #e0ede9;">
              <p style="margin:0;font-size:14px;color:#374151;">이메일</p>
              <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#0f2a1e;">${email}</p>
            </div>
            <p style="margin-top:16px;font-size:12px;color:#9ca3af;">
              신청 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </p>
          </div>`,
      });
    })(),

    // 3. 사용자 환영 이메일
    (async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "SellFit <noreply@sellfit.kr>",
        to: email,
        subject: "SellFit 7일 무료 체험이 시작됐어요! 🎉",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
            <div style="background:linear-gradient(135deg,#0f2a1e,#1a4a32);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
              <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 8px;">SellFit</p>
              <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">7일 무료 체험 시작!</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">스마트스토어 AI 매출 파트너</p>
            </div>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
              안녕하세요! SellFit 7일 무료 체험에 오신 것을 환영합니다.<br/>
              지금 바로 모든 기능을 사용해보세요.
            </p>
            <ul style="color:#4b5563;font-size:14px;line-height:2;padding-left:20px;">
              <li>📊 실시간 트렌드 분석</li>
              <li>🔍 상품명 SEO 최적화</li>
              <li>💡 광고 전략 추천</li>
              <li>💰 가격 책정 전략</li>
              <li>💬 고객 응대 자동화</li>
            </ul>
            <a href="https://sellfit.kr" style="display:block;text-align:center;background:#00aa6c;color:#fff;font-weight:700;padding:14px 24px;border-radius:12px;text-decoration:none;margin-top:24px;font-size:15px;">
              SellFit 바로가기 →
            </a>
            <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
              SellFit · AI 스마트스토어 매출 파트너
            </p>
          </div>`,
      });
    })(),
  ]);

  const sheetsOk = !SHEETS_WEBHOOK || results[0].status === "fulfilled";
  const adminOk  = results[1].status === "fulfilled";
  const userOk   = results[2].status === "fulfilled";

  if (!adminOk) console.error("[collect-email] 관리자 이메일 실패:", (results[1] as PromiseRejectedResult).reason);
  if (!userOk)  console.error("[collect-email] 사용자 이메일 실패:", (results[2] as PromiseRejectedResult).reason);

  console.log("[collect-email]", { email, sheetsOk, adminOk, userOk });

  return NextResponse.json({ ok: true, adminOk, userOk });
}
