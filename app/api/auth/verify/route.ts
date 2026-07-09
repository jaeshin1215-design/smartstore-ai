import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

// 매직링크 검증 — 만료(15분)·1회용 → 세션 생성 → HttpOnly 쿠키 → / 리다이렉트

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, req.nextUrl.origin));

  if (!/^[a-f0-9]{64}$/.test(token)) return fail("링크가 올바르지 않습니다");

  const r = await db.execute({
    sql: "SELECT token, email, expires_at, used_at FROM sellfit_auth_tokens WHERE token = ?",
    args: [token],
  });
  const row = r.rows[0];
  if (!row) return fail("링크가 올바르지 않습니다");
  if (row.used_at) return fail("이미 사용된 링크입니다 — 다시 요청하세요");
  if (Number(row.expires_at) < Date.now()) return fail("링크가 만료됐습니다 — 다시 요청하세요");

  // 1회용 처리
  await db.execute({
    sql: "UPDATE sellfit_auth_tokens SET used_at = datetime('now') WHERE token = ?",
    args: [token],
  });

  const user = await db.execute({
    sql: "SELECT id FROM sellfit_users WHERE email = ?",
    args: [String(row.email)],
  });
  if (!user.rows[0]) return fail("등록되지 않은 사용자입니다");

  const { cookieValue, expiresAtMs } = await createSession(String(user.rows[0].id));

  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // 로컬(http)에서는 Secure 제외
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAtMs),
  });
  return res;
}
