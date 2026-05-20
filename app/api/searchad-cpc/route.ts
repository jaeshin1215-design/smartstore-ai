export const maxDuration = 20;

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const BASE_URL = "https://api.naver.com";
const ACCESS_LICENSE = process.env.NAVER_AD_ACCESS_LICENSE!;
const SECRET_KEY = process.env.NAVER_AD_SECRET_KEY!;
const CUSTOMER_ID = process.env.NAVER_AD_CUSTOMER_ID!;

function makeSignature(timestamp: string, method: string, path: string): string {
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac("sha256", SECRET_KEY).update(message).digest("base64");
}

async function searchAdFetch(path: string) {
  const timestamp = Date.now().toString();
  const signature = makeSignature(timestamp, "GET", path);

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": ACCESS_LICENSE,
      "X-Customer": CUSTOMER_ID,
      "X-Signature": signature,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SearchAd ${res.status}: ${err}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return NextResponse.json({ error: "키워드 필요" }, { status: 400 });

  try {
    // 키워드 도구로 CPC 추정값 조회
    const path = `/keywordstool?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;
    const data = await searchAdFetch(path);

    const keywords = data?.keywordList ?? [];
    const match = keywords.find((k: { relKeyword: string }) =>
      k.relKeyword === keyword
    ) ?? keywords[0];

    if (!match) {
      return NextResponse.json({ cpc: null, competition: null, monthlyClick: null });
    }

    const pcCpc = match.compIdx ?? null;
    const mobileCpc = match.mobileCompIdx ?? null;
    const monthlyClick = (match.monthlyPcQcCnt ?? 0) + (match.monthlyMobileQcCnt ?? 0);
    const competition = match.compIdx ?? null;

    return NextResponse.json({
      keyword: match.relKeyword,
      monthlySearchPc: match.monthlyPcQcCnt ?? 0,
      monthlySearchMobile: match.monthlyMobileQcCnt ?? 0,
      monthlySearch: monthlyClick,
      pcCpc,
      mobileCpc,
      competition,
      isAdult: match.isAdult === "1",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
