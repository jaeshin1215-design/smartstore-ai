import { NextResponse } from "next/server";
import { fetchSabangnetToken } from "@/lib/sabangnet/auth";

export async function GET() {
  const secret = process.env.SABANGNET_CLIENT_SECRET ?? "(없음)";
  try {
    const token = await fetchSabangnetToken();
    return NextResponse.json({
      success: true,
      message: "사방넷 OAuth 토큰 발급 성공",
      tokenPreview: token.substring(0, 20) + "...",
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: e.message,
        secretDebug: secret,
        secretLength: secret.length,
        baseUrl: process.env.SABANGNET_BASE_URL || "(없음 → 직접호출)",
        proxySecret: process.env.SELLFIT_PROXY_SECRET ? "설정됨" : "(없음)",
      },
      { status: 500 }
    );
  }
}
