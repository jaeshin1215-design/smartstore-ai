export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL = "jaeshin1215@gmail.com";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    q1Star, q1Text, q2Text,
    q3Star, q3Text, q4Text,
    q5Star, q5Text, q6Text,
    q7Text, q8Text,
    q9, q10Text,
  } = body;

  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body>
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f2a1e">
  <h1 style="color:#00aa6c;font-size:20px;margin-bottom:4px">이다슬 설문 답변</h1>
  <p style="color:#9ca3af;font-size:13px;margin-bottom:32px">이지스토리 · SellFit 피드백</p>

  <h2 style="font-size:15px;color:#6b8c7a;border-bottom:1px solid #e0ede9;padding-bottom:8px;margin-bottom:16px">섹션 1 — SEO 탭</h2>
  <p><strong>Q1 만족도:</strong> ${stars(q1Star)} (${q1Star}/5)</p>
  <p><strong>Q1 도움된 점:</strong><br>${q1Text?.replace(/\n/g, "<br>")}</p>
  <p style="margin-top:12px"><strong>Q2 개선 사항:</strong><br>${q2Text?.replace(/\n/g, "<br>")}</p>

  <h2 style="font-size:15px;color:#6b8c7a;border-bottom:1px solid #e0ede9;padding-bottom:8px;margin:28px 0 16px">섹션 2 — 광고 탭</h2>
  <p><strong>Q3 만족도:</strong> ${stars(q3Star)} (${q3Star}/5)</p>
  <p><strong>Q3 도움된 점:</strong><br>${q3Text?.replace(/\n/g, "<br>")}</p>
  <p style="margin-top:12px"><strong>Q4 개선 사항:</strong><br>${q4Text?.replace(/\n/g, "<br>")}</p>

  <h2 style="font-size:15px;color:#6b8c7a;border-bottom:1px solid #e0ede9;padding-bottom:8px;margin:28px 0 16px">섹션 3 — 가격 탭</h2>
  <p><strong>Q5 만족도:</strong> ${stars(q5Star)} (${q5Star}/5)</p>
  <p><strong>Q5 도움된 점:</strong><br>${q5Text?.replace(/\n/g, "<br>")}</p>
  <p style="margin-top:12px"><strong>Q6 개선 사항:</strong><br>${q6Text?.replace(/\n/g, "<br>")}</p>

  <h2 style="font-size:15px;color:#6b8c7a;border-bottom:1px solid #e0ede9;padding-bottom:8px;margin:28px 0 16px">섹션 4 — 영업·마케팅 현장 감각</h2>
  <p><strong>Q7 카테고리 성격:</strong><br>${q7Text?.replace(/\n/g, "<br>")}</p>
  <p style="margin-top:12px"><strong>Q8 고객 반응 패턴:</strong><br>${q8Text?.replace(/\n/g, "<br>")}</p>

  <h2 style="font-size:15px;color:#6b8c7a;border-bottom:1px solid #e0ede9;padding-bottom:8px;margin:28px 0 16px">섹션 5 — 가격 결정 흐름</h2>
  <p><strong>Q9 가격 결정 방식:</strong> ${(q9 as string[])?.join(", ")}</p>

  <h2 style="font-size:15px;color:#6b8c7a;border-bottom:1px solid #e0ede9;padding-bottom:8px;margin:28px 0 16px">섹션 6 — 자유 의견</h2>
  <p>${q10Text ? q10Text.replace(/\n/g, "<br>") : "(없음)"}</p>

  <div style="margin-top:32px;padding:16px;background:#e8f5f0;border-radius:8px">
    <p style="font-size:12px;color:#6b8c7a;margin:0">Aiges Pontos · J&A AI · SellFit 이지스토리 PoC</p>
  </div>
</div></body></html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: "SellFit <onboarding@resend.dev>",
    to: ADMIN_EMAIL,
    subject: "[SellFit] 이다슬 설문 답변 도착",
    html,
  });

  if (error) {
    console.error("[survey] Resend error:", JSON.stringify(error));
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log("[survey] Resend success:", data?.id);
  return NextResponse.json({ ok: true, id: data?.id });
}
