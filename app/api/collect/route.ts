export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const DL_URL = "https://openapi.naver.com/v1/datalab/search";
const SHOP_URL = "https://openapi.naver.com/v1/search/shop.json";
const DL_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const DL_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;
const SHOP_ID = process.env.NAVER_CLIENT_ID!;
const SHOP_SECRET = process.env.NAVER_CLIENT_SECRET!;

const SEARCHAD_BASE = "https://api.naver.com";
const AD_LICENSE = process.env.NAVER_AD_ACCESS_LICENSE;
const AD_SECRET = process.env.NAVER_AD_SECRET_KEY;
const AD_CUSTOMER = process.env.NAVER_AD_CUSTOMER_ID;

import crypto from "crypto";

function makeAdSignature(timestamp: string, method: string, path: string): string {
  if (!AD_SECRET) return "";
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac("sha256", AD_SECRET).update(message).digest("base64");
}

async function fetchSearchVolume(keyword: string): Promise<number> {
  if (!keyword) return 0;
  try {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const body = {
      startDate: fmt(start), endDate: fmt(end),
      timeUnit: "month",
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    };
    const res = await fetch(DL_URL, {
      method: "POST",
      headers: { "X-Naver-Client-Id": DL_ID, "X-Naver-Client-Secret": DL_SECRET, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const ratios: number[] = data?.results?.[0]?.data?.map((d: { ratio: number }) => d.ratio) ?? [];
    return ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : 0;
  } catch { return 0; }
}

async function fetchCpc(keyword: string): Promise<number> {
  if (!keyword || !AD_LICENSE || !AD_SECRET || !AD_CUSTOMER) return 0;
  try {
    const path = `/keywordstool?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;
    const timestamp = Date.now().toString();
    const res = await fetch(`${SEARCHAD_BASE}${path}`, {
      headers: {
        "X-Timestamp": timestamp, "X-API-KEY": AD_LICENSE,
        "X-Customer": AD_CUSTOMER, "X-Signature": makeAdSignature(timestamp, "GET", path),
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const match = data?.keywordList?.find((k: { relKeyword: string }) => k.relKeyword === keyword)
      ?? data?.keywordList?.[0];
    return match?.compIdx ?? 0;
  } catch { return 0; }
}

async function fetchCompetitors(keyword: string): Promise<number> {
  if (!keyword) return 0;
  try {
    const res = await fetch(`${SHOP_URL}?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { "X-Naver-Client-Id": SHOP_ID, "X-Naver-Client-Secret": SHOP_SECRET },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.total ?? 0;
  } catch { return 0; }
}

export async function POST(req: NextRequest) {
  const { store_id } = await req.json();
  if (!store_id) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  // 등록된 상품 목록 조회
  const result = await db.execute({
    sql: "SELECT * FROM sellfit_products WHERE store_id = ?",
    args: [store_id],
  });
  const products = result.rows;

  if (products.length === 0) {
    return NextResponse.json({ error: "등록된 상품 없음" }, { status: 400 });
  }

  const collected = [];

  for (const p of products) {
    const keyword = String(p.keyword || "");
    const [searchVolume, cpc, competitors] = await Promise.all([
      fetchSearchVolume(keyword),
      fetchCpc(keyword),
      fetchCompetitors(keyword),
    ]);

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO sellfit_daily_metrics
            (id, product_id, price, review_count, search_volume, cpc, competitors)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, String(p.id), p.price ?? null, null, searchVolume, cpc, competitors],
    });

    collected.push({
      product: String(p.name), keyword,
      searchVolume, cpc, competitors,
    });
  }

  return NextResponse.json({ ok: true, collected, count: collected.length });
}

// GET: 최근 수집 데이터 조회
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  const result = await db.execute({
    sql: `SELECT m.*, p.name, p.keyword, p.category, p.is_own
          FROM sellfit_daily_metrics m
          JOIN sellfit_products p ON m.product_id = p.id
          WHERE p.store_id = ?
          ORDER BY m.collected_at DESC
          LIMIT 50`,
    args: [storeId],
  });

  return NextResponse.json({ metrics: result.rows });
}
