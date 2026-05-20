import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "인증 코드가 없습니다." }, { status: 400 });
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await res.json();

  if (!tokens.access_token) {
    return NextResponse.json({ error: "토큰 발급 실패", detail: tokens }, { status: 500 });
  }

  const response = NextResponse.redirect(new URL("/?calendar=success", req.nextUrl.origin));
  response.cookies.set("google_access_token", tokens.access_token, {
    httpOnly: true,
    maxAge: 3600,
    path: "/",
  });
  if (tokens.refresh_token) {
    response.cookies.set("google_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
