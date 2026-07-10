import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// 현재 로그인 세션 정보 (이메일·store_id) — 네비 계정 표시용
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { email: session.email, storeId: session.storeId } });
}
