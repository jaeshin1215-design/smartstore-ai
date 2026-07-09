import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (session) await deleteSession(session.sessionId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
