export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const CLIENT_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return NextResponse.json({ error: "키워드 필요" }, { status: 400 });

  try {
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=1`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
      },
    });

    if (!res.ok) return NextResponse.json({ error: "쇼핑 API 오류" }, { status: 502 });

    const json = await res.json();
    const total: number = json?.total ?? 0;

    return NextResponse.json({ total });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
