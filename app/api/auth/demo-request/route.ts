import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { db } from "@/lib/db";

// 셀프서비스 데모 신청 (2026-07-14 Track②) — /try 페이지 전용.
// 이메일만 받아 ①리드 기록 ②데모 유저 upsert(store=demo-store-001) ③매직링크 발송.
// 일반 /api/auth/request(초대제)와 분리 — 이 라우트로는 데모 스토어 계정만 만들어진다.

const RESEND_KEY = process.env.RESEND_API_KEY;
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15분 (기존 매직링크와 동일)
const DEMO_STORE_ID = "demo-store-001";
const EMAIL_RESEND_GAP_MS = 60 * 1000; // 같은 이메일 재신청 최소 간격
const IP_HOURLY_LIMIT = 10; // IP당 시간당 신청 상한

export async function POST(req: NextRequest) {
  let email = "";
  let source = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    source = String(body.source ?? "try-page").slice(0, 100);
  } catch { /* 아래 검증에서 걸림 */ }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력해주세요." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();

  // rate limit ① — IP당 시간당 상한
  const ipCount = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM sellfit_demo_requests WHERE ip = ? AND created_at > ?",
    args: [ip, now - 3600_000],
  });
  if (Number(ipCount.rows[0].n) >= IP_HOURLY_LIMIT) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  // rate limit ② — 같은 이메일 재신청 간격
  const lead = await db.execute({
    sql: "SELECT id, last_requested_at FROM sellfit_demo_leads WHERE email = ?",
    args: [email],
  });
  if (lead.rows[0] && now - Number(lead.rows[0].last_requested_at) < EMAIL_RESEND_GAP_MS) {
    return NextResponse.json({ error: "방금 발송됐습니다. 메일함을 확인하시고, 1분 후 다시 시도해주세요." }, { status: 429 });
  }

  // 신청 로그 (rate limit 판단 근거)
  await db.execute({
    sql: "INSERT INTO sellfit_demo_requests (id, email, ip, created_at) VALUES (?, ?, ?, ?)",
    args: [randomUUID(), email, ip, now],
  });

  // 리드 기록 upsert
  if (lead.rows[0]) {
    await db.execute({
      sql: "UPDATE sellfit_demo_leads SET last_requested_at = ?, request_count = request_count + 1 WHERE email = ?",
      args: [now, email],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO sellfit_demo_leads (id, email, first_requested_at, last_requested_at, request_count, source) VALUES (?, ?, ?, ?, 1, ?)",
      args: [randomUUID(), email, now, now, source],
    });
  }

  // 데모 유저 upsert — 기존 계정이 있으면 스토어를 절대 건드리지 않는다
  // (직원 이메일로 신청해도 직원 계정의 store_id가 demo로 바뀌는 사고 방지)
  const user = await db.execute({ sql: "SELECT id FROM sellfit_users WHERE email = ?", args: [email] });
  if (!user.rows[0]) {
    await db.execute({
      sql: "INSERT INTO sellfit_users (id, email, store_id) VALUES (?, ?, ?)",
      args: [randomUUID(), email, DEMO_STORE_ID],
    });
  }

  // 매직링크 발급 (기존 verify 재사용 — 데모 계정이면 verify가 7일 세션 발급)
  const token = randomBytes(32).toString("hex");
  await db.execute({
    sql: "INSERT INTO sellfit_auth_tokens (token, email, expires_at) VALUES (?, ?, ?)",
    args: [token, email, now + TOKEN_TTL_MS],
  });
  const link = `${req.nextUrl.origin}/api/auth/verify?token=${token}`;

  if (!RESEND_KEY) {
    console.error("[auth/demo-request] RESEND_API_KEY 미설정 — 발송 불가");
    return NextResponse.json({ error: "발송 설정 오류입니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  const from = process.env.AUTH_EMAIL_FROM || "SellFit <onboarding@resend.dev>";
  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from,
      to: email,
      subject: "SellFit 데모 체험 링크입니다",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#111827;font-size:18px">SellFit 데모 체험</h2>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            안녕하세요, 셀러 매출 파트너 <b>SellFit</b>입니다.<br>
            요청하신 데모 체험 링크를 보내드립니다. 별도 회원가입 없이
            아래 버튼을 누르면 샘플 데이터로 채워진 데모 화면으로 바로 입장합니다.
          </p>
          <a href="${link}"
             style="display:inline-block;margin:16px 0;padding:12px 28px;background:#ef567c;color:#fff;
                    text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">
            SellFit 데모 입장 →
          </a>
          <p style="color:#4b5563;font-size:13px;line-height:1.6">
            링크는 <b>15분간, 1회만</b> 유효합니다. 만료되면
            신청 페이지에서 같은 이메일로 다시 요청해주세요.<br>
            데모 이용 기간은 첫 입장 후 <b>7일</b>입니다.
          </p>
          <p style="color:#9ca3af;font-size:12px">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
        </div>`,
    }),
  }).catch((e) => {
    console.error("[auth/demo-request] 발송 요청 실패:", e);
    return null;
  });

  if (!sendRes || !sendRes.ok) {
    console.error("[auth/demo-request] Resend 응답 오류:", sendRes?.status, await sendRes?.text().catch(() => ""));
    return NextResponse.json({ error: "메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "데모 체험 링크를 발송했습니다. 메일함을 확인해주세요." });
}
