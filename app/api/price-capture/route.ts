import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import {
  coupangMarginPct,
  judgeMargin,
  kstToday,
  type SafetyLevel,
} from "@/lib/priceguard";
import { resolveStoreId } from "@/lib/auth";

// Price Guard 수집 라우트
// POST: 확장(source=extension) 또는 수기 보정(source=manual)의 가격 캡처 적재 — 원천만 저장
// GET: 보드 데이터 — 상품별 최신가·마진율·판정·추이 (판정은 조회 시 계산)

interface CaptureInput {
  product_id?: string;
  coupang_product_id?: string;
  price: number;
  is_ad?: boolean;
  is_item_winner?: boolean | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { source } = body;
  // 스토어 스코핑: 세션이 있으면 세션 store_id, 확장 토큰 요청만 body 파라미터 허용
  const store_id = await resolveStoreId(req, body.store_id ?? null);
  // 단건({...}) / 배치({captures: [...]}) 모두 수용
  const captures: CaptureInput[] = Array.isArray(body.captures)
    ? body.captures
    : body.price != null
      ? [{ product_id: body.product_id, coupang_product_id: body.coupang_product_id, price: body.price, is_ad: body.is_ad, is_item_winner: body.is_item_winner }]
      : [];

  if (!store_id || captures.length === 0) {
    return NextResponse.json({ error: "store_id·price 필요" }, { status: 400 });
  }

  const checkDate = kstToday();
  const saved: string[] = [];

  for (const c of captures) {
    if (c.price == null || Number(c.price) <= 0) continue;

    // coupang_product_id만 온 경우(확장) product_id 역매핑
    let productId = c.product_id ?? null;
    if (!productId && c.coupang_product_id) {
      const r = await db.execute({
        sql: "SELECT id FROM sellfit_products WHERE store_id = ? AND coupang_product_id = ? LIMIT 1",
        args: [store_id, c.coupang_product_id],
      });
      productId = r.rows[0] ? String(r.rows[0].id) : null;
    }

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO sellfit_price_captures
        (id, store_id, product_id, coupang_product_id, price, is_ad, is_item_winner, source, check_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, store_id, productId, c.coupang_product_id ?? null,
        Number(c.price), c.is_ad ? 1 : 0,
        c.is_item_winner == null ? null : c.is_item_winner ? 1 : 0,
        source === "extension" ? "extension" : "manual", checkDate,
      ],
    });
    saved.push(id);
  }

  return NextResponse.json({ ok: true, saved: saved.length, check_date: checkDate });
}

interface BoardRow {
  product_id: string;
  product_name: string;
  is_own: number;
  supply_price: number | null;
  coupang_url: string | null;
  today_price: number | null;
  margin_pct: number | null;
  margin_dropped: boolean; // 직전 캡처 대비 마진율 하락 여부 (▼ 표시)
  level: SafetyLevel | null;
  margin_warn_pct: number | null;   // 이력 테이블 강조 기준 (판정 로직 무변경, 표시용 전달)
  margin_danger_pct: number | null;
  fee_rate: number | null;          // 쿠팡 판매수수료율(%) — 카테고리 참고값
  fee_confirmed: boolean;           // true=확정 / false=추정(참고값)
  is_item_winner: number | null;
  last_checked_at: string | null;
  history: { check_date: string; price: number; margin_pct: number | null }[];
}

export async function GET(req: NextRequest) {
  // 스토어 스코핑: 세션이 있으면 세션 store_id, 확장 토큰 요청만 파라미터 허용
  const storeId = await resolveStoreId(req, req.nextUrl.searchParams.get("store_id"));
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  // 카테고리별 수수료율 매핑 (참고값, 2026-07-14) — category 기준 조인용
  const feeRatesResult = await db.execute("SELECT category, fee_rate, is_confirmed FROM sellfit_fee_rates").catch(() => ({ rows: [] as Record<string, unknown>[] }));
  const feeByCategory = new Map<string, { rate: number | null; confirmed: boolean }>();
  for (const f of feeRatesResult.rows) {
    feeByCategory.set(String(f.category), { rate: f.fee_rate != null ? Number(f.fee_rate) : null, confirmed: Number(f.is_confirmed) === 1 });
  }

  // 추적 대상: 쿠팡 URL이 등록됐거나 캡처 이력이 있는 상품
  const productsResult = await db.execute({
    sql: `SELECT id, name, is_own, purchase_price, coupang_url, margin_warn_pct, margin_danger_pct, category
          FROM sellfit_products WHERE store_id = ?`,
    args: [storeId],
  });

  // 최근 30일 캡처 (스파크라인·상세 그래프용)
  const capturesResult = await db.execute({
    sql: `SELECT product_id, price, is_ad, is_item_winner, check_date, captured_at
          FROM sellfit_price_captures
          WHERE store_id = ? AND check_date >= date('now', '-30 days')
          ORDER BY captured_at ASC`,
    args: [storeId],
  });

  const capturesByProduct = new Map<string, typeof capturesResult.rows>();
  for (const row of capturesResult.rows) {
    const pid = row.product_id ? String(row.product_id) : "";
    if (!pid) continue;
    if (!capturesByProduct.has(pid)) capturesByProduct.set(pid, []);
    capturesByProduct.get(pid)!.push(row);
  }

  const today = kstToday();
  const rows: BoardRow[] = [];

  for (const p of productsResult.rows) {
    const pid = String(p.id);
    const caps = capturesByProduct.get(pid) ?? [];
    if (!p.coupang_url && caps.length === 0) continue; // 추적 대상 아님

    const supplyPrice = p.purchase_price != null ? Number(p.purchase_price) : null;
    const warnPct = p.margin_warn_pct != null ? Number(p.margin_warn_pct) : null;
    const dangerPct = p.margin_danger_pct != null ? Number(p.margin_danger_pct) : null;

    // 일자별 마지막 캡처만 (하루 다회 수집 대비)
    const byDate = new Map<string, { check_date: string; price: number }>();
    for (const c of caps) {
      byDate.set(String(c.check_date), { check_date: String(c.check_date), price: Number(c.price) });
    }
    const history = [...byDate.values()].map(h => ({
      ...h,
      margin_pct: coupangMarginPct(h.price, supplyPrice),
    }));

    const latest = caps.length > 0 ? caps[caps.length - 1] : null;
    const todayCapture = history.find(h => h.check_date === today) ?? null;
    const latestPrice = todayCapture?.price ?? (history.length > 0 ? history[history.length - 1].price : null);
    const marginPct = coupangMarginPct(latestPrice, supplyPrice);

    const prevEntry = history.length >= 2 ? history[history.length - 2] : null;
    const marginDropped =
      marginPct != null && prevEntry?.margin_pct != null && marginPct < prevEntry.margin_pct;

    // 아이템위너: 가장 최근에 값이 기록된 캡처 기준
    let itemWinner: number | null = null;
    for (let i = caps.length - 1; i >= 0; i--) {
      if (caps[i].is_item_winner != null) { itemWinner = Number(caps[i].is_item_winner); break; }
    }

    rows.push({
      product_id: pid,
      product_name: String(p.name),
      is_own: Number(p.is_own),
      supply_price: supplyPrice,
      coupang_url: p.coupang_url ? String(p.coupang_url) : null,
      today_price: latestPrice,
      margin_pct: marginPct,
      margin_dropped: marginDropped,
      level: judgeMargin(marginPct, warnPct, dangerPct),
      margin_warn_pct: warnPct,
      margin_danger_pct: dangerPct,
      fee_rate: feeByCategory.get(String(p.category ?? ""))?.rate ?? null,
      fee_confirmed: feeByCategory.get(String(p.category ?? ""))?.confirmed ?? false,
      is_item_winner: itemWinner,
      last_checked_at: latest ? String(latest.captured_at) : null,
      history,
    });
  }

  // 위험 먼저 정렬
  const order: Record<string, number> = { 위험: 0, 주의: 1, 안전: 2 };
  rows.sort((a, b) => (order[a.level ?? ""] ?? 3) - (order[b.level ?? ""] ?? 3));

  const counts = {
    danger: rows.filter(r => r.level === "위험").length,
    warn: rows.filter(r => r.level === "주의").length,
    safe: rows.filter(r => r.level === "안전").length,
  };
  const checkedToday = rows.some(r => r.history.some(h => h.check_date === today));
  const lastCheckedAt = rows.reduce<string | null>(
    (acc, r) => (r.last_checked_at && (!acc || r.last_checked_at > acc) ? r.last_checked_at : acc),
    null
  );

  return NextResponse.json({ rows, counts, checked_today: checkedToday, last_checked_at: lastCheckedAt });
}
