export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const NAVER_API = "https://openapi.naver.com/v1/datalab/search";
const CLIENT_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const CLIENT_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return NextResponse.json({ error: "키워드 필요" }, { status: 400 });

  const { startDate, endDate } = getDateRange();

  try {
    const res = await fetch(NAVER_API, {
      method: "POST",
      headers: {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        timeUnit: "date",
        keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "DataLab 오류" }, { status: 502 });

    const json = await res.json();
    const data: { period: string; ratio: number }[] = json?.results?.[0]?.data ?? [];

    if (!data.length) return NextResponse.json({ avgRatio: 0, growth: 0, trend: [] });

    const ratios = data.map(d => Math.round(d.ratio * 10) / 10);
    const avgRatio = Math.round(ratios.reduce((s, r) => s + r, 0) / ratios.length * 10) / 10;

    const recent7 = ratios.slice(-7);
    const prev7 = ratios.slice(-14, -7);
    const recentAvg = recent7.reduce((s, r) => s + r, 0) / (recent7.length || 1);
    const prevAvg = prev7.reduce((s, r) => s + r, 0) / (prev7.length || 1);
    const growth = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0;

    return NextResponse.json({ avgRatio, growth, trend: ratios.slice(-14) });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
