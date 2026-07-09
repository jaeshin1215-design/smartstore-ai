import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";

// 매직링크 발송 — 초대제(allowlist): sellfit_users에 있는 이메일만 발송.
// 등록 여부는 응답으로 노출하지 않는다 (항상 동일 응답).

const RESEND_KEY = process.env.RESEND_API_KEY;
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15분

export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch { /* 아래 검증에서 걸림 */ }

  const SAME_RESPONSE = NextResponse.json({ ok: true, message: "등록된 이메일이면 로그인 링크가 발송됩니다. 메일함을 확인하세요." });

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return SAME_RESPONSE;

  const user = await db.execute({ sql: "SELECT id FROM sellfit_users WHERE email = ?", args: [email] });
  if (user.rows.length === 0) return SAME_RESPONSE; // 미등록 — 동일 응답, 발송 없음

  const token = randomBytes(32).toString("hex");
  await db.execute({
    sql: "INSERT INTO sellfit_auth_tokens (token, email, expires_at) VALUES (?, ?, ?)",
    args: [token, email, Date.now() + TOKEN_TTL_MS],
  });

  const link = `${req.nextUrl.origin}/api/auth/verify?token=${token}`;

  if (!RESEND_KEY) {
    console.error("[auth/request] RESEND_API_KEY 미설정 — 발송 불가");
    return SAME_RESPONSE;
  }

  // sellfit.kr 도메인 Resend 인증 전까지 onboarding@resend.dev 사용 (AUTH_EMAIL_FROM으로 전환)
  const from = process.env.AUTH_EMAIL_FROM || "SellFit <onboarding@resend.dev>";

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from,
      to: email,
      subject: "SellFit 로그인 링크",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#111827;font-size:18px">SellFit 로그인</h2>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            아래 버튼을 누르면 로그인됩니다. 링크는 <b>15분간, 1회만</b> 유효합니다.
          </p>
          <a href="${link}"
             style="display:inline-block;margin:16px 0;padding:12px 28px;background:#ef567c;color:#fff;
                    text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">
            SellFit 로그인 →
          </a>
          <p style="color:#9ca3af;font-size:12px">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
        </div>`,
    }),
  }).catch((e) => {
    console.error("[auth/request] 발송 요청 실패:", e);
    return null;
  });

  // 조용한 실패 금지 — Resend 에러는 서버 로그에 남긴다 (응답은 동일 유지)
  if (sendRes && !sendRes.ok) {
    console.error("[auth/request] Resend 응답 오류:", sendRes.status, await sendRes.text().catch(() => ""));
  }

  return SAME_RESPONSE;
}
