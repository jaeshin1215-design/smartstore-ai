import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY!;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY!;
const VENDOR_ID = process.env.COUPANG_VENDOR_ID!;
const BASE_URL = process.env.COUPANG_BASE_URL || "https://api-gateway.coupang.com";
const PROXY_SECRET = process.env.SELLFIT_PROXY_SECRET;

function toDatetimeStr(date: Date): string {
  // YYMMDDTHHmmssZ (2자리 연도, UTC) — 쿠팡 Wing 공식 문서 형식
  const iso = date.toISOString();
  return iso.substring(2, 4) + iso.substring(5, 7) + iso.substring(8, 10)
    + "T" + iso.substring(11, 13) + iso.substring(14, 16) + iso.substring(17, 19) + "Z";
}

function sign(method: string, path: string, query: string, datetime: string) {
  const sig = (msg: string) =>
    createHmac("sha256", SECRET_KEY).update(msg).digest("hex");

  return {
    "대문자+슬래시포함": sig(datetime + method.toUpperCase() + path + query),
    "대문자+슬래시제거": sig(datetime + method.toUpperCase() + path.replace(/^\//, "") + query),
    "소문자+슬래시포함": sig(datetime + method.toLowerCase() + path + query),
    "소문자+슬래시제거": sig(datetime + method.toLowerCase() + path.replace(/^\//, "") + query),
  };
}

async function tryCall(method: string, path: string, query: string, signKey: string) {
  const datetime = toDatetimeStr(new Date());
  const sigs = sign(method, path, query, datetime);
  const signature = sigs[signKey as keyof typeof sigs];
  const authorization = `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
  const url = `${BASE_URL}${path}${query ? `?${query}` : ""}`;

  const headers: Record<string, string> = {
    Authorization: authorization,
    "Content-Type": "application/json;charset=UTF-8",
    "X-Requested-By": VENDOR_ID,
  };
  if (PROXY_SECRET) headers["x-proxy-secret"] = PROXY_SECRET;

  const res = await fetch(url, { method, headers, cache: "no-store" });
  return { status: res.status, body: await res.text() };
}

export async function GET() {
  // 주문 조회 — 인증 및 기본 접근 권한 확인
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
  const path = `/v2/providers/openapi/apis/api/v4/vendors/${VENDOR_ID}/ordersheets`;
  const query = `createdAtFrom=${fmt(sevenDaysAgo)}&createdAtTo=${fmt(now)}&maxPerPage=5`;

  try {
    const result = await tryCall("GET", path, query, "대문자+슬래시포함");
    return NextResponse.json({
      status: result.status,
      body: JSON.parse(result.body),
    });
  } catch (e) {
    return NextResponse.json({ status: -1, error: String(e) }, { status: 500 });
  }
}
