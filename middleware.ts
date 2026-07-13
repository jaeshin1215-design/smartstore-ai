// SellFit 전역 인증 미들웨어 (2026-07-09 전면 교체)
// 원칙: 세션 없으면 페이지는 /login, API는 401 JSON. 예외는 아래 명시 목록뿐.
// 엣지 런타임 — DB 접근 없이 서명 세션 쿠키(HMAC-SHA256)의 서명·만료만 검증.
// (세션 실존·스토어 스코핑은 각 라우트의 getSession/resolveStoreId가 DB로 확정)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sellfit_session";

// 인증 없이 통과하는 경로
// /try = 셀프서비스 데모 신청 (2026-07-14 Track②). demo-request는 /api/auth/ 하위라 자동 공개.
const PUBLIC_PREFIXES = ["/api/auth/", "/login", "/api/google/callback", "/try"];

async function hmacHex(secretStr: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secretStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hasValidSessionCookie(req: NextRequest): Promise<boolean> {
  const secretStr = process.env.SESSION_SECRET;
  if (!secretStr) return false; // 시크릿 미설정 = 전부 차단 (열림보다 닫힘)
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [sid, expStr, sig] = parts;
  if (!/^\d+$/.test(expStr) || Number(expStr) < Date.now()) return false;
  const expected = await hmacHex(secretStr, `${sid}.${expStr}`);
  return sig === expected;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "인증 필요" }, { status: 401 });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ① 공개 경로
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ② 크론 — Vercel cron이 붙이는 Authorization: Bearer ${CRON_SECRET} 검증
  if (pathname.startsWith("/api/cron/")) {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.next();
    }
    return unauthorized();
  }

  // ③ Price Guard 확장 — 세션 쿠키 불가, 확장 전용 고정 토큰 (또는 웹 UI의 세션)
  //    /api/stores GET은 확장 최초 설정의 PIN→스토어 해석에 필요
  if (pathname === "/api/price-capture" || (pathname === "/api/stores" && req.method === "GET")) {
    const token = req.headers.get("x-extension-token");
    if (process.env.EXTENSION_TOKEN && token === process.env.EXTENSION_TOKEN) {
      return NextResponse.next();
    }
    if (await hasValidSessionCookie(req)) return NextResponse.next();
    return unauthorized();
  }

  // ④ 그 외 전부 — 세션 필수
  if (await hasValidSessionCookie(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return unauthorized();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 정적 자원 제외, /api 포함 전 경로
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js\\.map)).*)"],
};
