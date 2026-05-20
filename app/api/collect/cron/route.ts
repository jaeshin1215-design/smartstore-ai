export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const CRON_SECRET = process.env.CRON_SECRET;

const DL_URL = "https://openapi.naver.com/v1/datalab/search";
const SHOP_URL = "https://openapi.naver.com/v1/search/shop.json";
const DL_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const DL_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;
const SHOP_ID = process.env.NAVER_CLIENT_ID!;
const SHOP_SECRET = process.env.NAVER_CLIENT_SECRET!;

import crypto from "crypto";
const SEARCHAD_BASE = "https://api.naver.com";
const AD_LICENSE = process.env.NAVER_AD_ACCESS_LICENSE;
const AD_SECRET_KEY = process.env.NAVER_AD_SECRET_KEY;
const AD_CUSTOMER = process.env.NAVER_AD_CUSTOMER_ID;

function makeAdSig(ts: string, method: string, path: string) {
  if (!AD_SECRET_KEY) return "";
  return crypto.createHmac("sha256", AD_SECRET_KEY).update(`${ts}.${method}.${path}`).digest("base64");
}

async function fetchVolume(keyword: string): Promise<number> {
  try {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const res = await fetch(DL_URL, {
      method: "POST",
      headers: { "X-Naver-Client-Id": DL_ID, "X-Naver-Client-Secret": DL_SECRET, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: fmt(start), endDate: fmt(end), timeUnit: "month",
        keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
      }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const ratios: number[] = data?.results?.[0]?.data?.map((d: { ratio: number }) => d.ratio) ?? [];
    return ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : 0;
  } catch { return 0; }
}

async function fetchCpc(keyword: string): Promise<number> {
  if (!AD_LICENSE || !AD_SECRET_KEY || !AD_CUSTOMER) return 0;
  try {
    const path = `/keywordstool?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;
    const ts = Date.now().toString();
    const res = await fetch(`${SEARCHAD_BASE}${path}`, {
      headers: { "X-Timestamp": ts, "X-API-KEY": AD_LICENSE, "X-Customer": AD_CUSTOMER, "X-Signature": makeAdSig(ts, "GET", path) },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const match = data?.keywordList?.find((k: { relKeyword: string }) => k.relKeyword === keyword) ?? data?.keywordList?.[0];
    return match?.compIdx ?? 0;
  } catch { return 0; }
}

async function fetchComp(keyword: string): Promise<number> {
  try {
    const res = await fetch(`${SHOP_URL}?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { "X-Naver-Client-Id": SHOP_ID, "X-Naver-Client-Secret": SHOP_SECRET },
    });
    if (!res.ok) return 0;
    return (await res.json())?.total ?? 0;
  } catch { return 0; }
}

export async function POST(req: NextRequest) {
  // Secret key 검증
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 모든 스토어의 상품 수집
  const storesResult = await db.execute("SELECT id, name FROM sellfit_stores");
  const stores = storesResult.rows;

  const summary = [];

  for (const store of stores) {
    const prodsResult = await db.execute({
      sql: "SELECT * FROM sellfit_products WHERE store_id = ?",
      args: [String(store.id)],
    });
    const products = prodsResult.rows;

    const collected = [];
    for (const p of products) {
      const keyword = String(p.keyword || "");
      const [searchVolume, cpc, competitors] = await Promise.all([
        fetchVolume(keyword), fetchCpc(keyword), fetchComp(keyword),
      ]);
      const id = randomUUID();
      await db.execute({
        sql: `INSERT INTO sellfit_daily_metrics (id, product_id, price, search_volume, cpc, competitors)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, String(p.id), p.price ?? null, searchVolume, cpc, competitors],
      });
      collected.push({ name: String(p.name), keyword, searchVolume, cpc, competitors });
    }
    summary.push({ store: String(store.name), products: collected.length });
  }

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), summary });
}
