import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 마진: (price - purchase_price) / price × 100 → score = min(100, pct × 2)
// 채널: 카테고리 기본값 + 가격대 조정(±8) + 결정적 미세 분산(price % 기반)
// → 같은 카테고리 안에서도 가격대가 다르면 자연스럽게 Y축 흩어짐

const CH_RULES: Array<{ re: RegExp; score: number }> = [
  { re: /화장품|스킨케어|마스크팩|에센스|세럼|선크림|로션|토너/, score: 85 },
  { re: /청소|세제|생활용품|주방|조리|냄비|프라이팬/, score: 80 },
  { re: /물놀이|수영|튜브|물총|아쿠아|비치|워터파크|수영복|래쉬가드/, score: 80 },
  { re: /캠핑|텐트|등산|아웃도어|트레킹|백팩|타프|랜턴|버너|코펠|해먹/, score: 78 },
  { re: /핫팩|손난로|방한|귀마개|목도리/, score: 78 },
  { re: /다리미판|다리미|압축팩|유아매트|화분|다육/, score: 76 },
  { re: /전기장판|온수매트|전기히터|난방/, score: 75 },
  { re: /패딩|점퍼|자켓|코트|가디건|니트|옷|의류/, score: 70 },
  { re: /신발|운동화|샌들|슬리퍼/, score: 60 },
  { re: /가방|지갑|벨트|액세서리/, score: 65 },
  { re: /다이어트|건강식품|영양제|프로틴/, score: 62 },
];

function channelScore(kw: string, price: number): number {
  let base = 50;
  for (const r of CH_RULES) {
    if (r.re.test(kw)) { base = r.score; break; }
  }
  // 가격대 조정: 고가 상품은 채널 적합도↑, 저가는↓
  const priceAdj =
    price >= 50000 ? 7 :
    price >= 30000 ? 4 :
    price >= 15000 ? 2 :
    price >= 8000  ? 0 :
    price >= 4000  ? -3 :
    -6;
  // 결정적 미세 분산: price 끝 두 자리로 ±3 범위 흩어짐
  const micro = ((price % 100) / 100) * 6 - 3;
  return Math.max(5, Math.min(98, Math.round(base + priceAdj + micro)));
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ items: [] });
  try {
    const res = await db.execute({
      sql: `SELECT id, name, keyword, category, price, purchase_price
            FROM sellfit_products
            WHERE store_id = ? AND price > 0 AND purchase_price > 0
            LIMIT 100`,
      args: [storeId],
    });

    // 드래그 오버라이드 병합 (테이블 없으면 무시)
    const overrides: Record<string, { margin_score?: number; channel_score?: number }> = {};
    try {
      const ovRes = await db.execute({
        sql: `SELECT product_id, margin_score, channel_score FROM sellfit_discover_overrides WHERE store_id = ?`,
        args: [storeId],
      });
      for (const r of ovRes.rows) {
        overrides[String(r.product_id)] = {
          margin_score: r.margin_score != null ? Number(r.margin_score) : undefined,
          channel_score: r.channel_score != null ? Number(r.channel_score) : undefined,
        };
      }
    } catch { /* 테이블 미생성 시 무시 */ }

    const items = res.rows.map(r => {
      const sell = Number(r.price) || 0;
      const buy  = Number(r.purchase_price) || 0;
      const pct  = sell > 0 ? (sell - buy) / sell * 100 : 0;
      const ms   = Math.min(100, Math.round(pct * 2));
      const kw   = String(r.keyword || r.name || "");
      const cs   = channelScore(kw, sell);
      const ov   = overrides[String(r.id)] ?? {};
      return {
        id: String(r.id),
        name: String(r.name || ""),
        category: String(r.category || ""),
        margin_score: ov.margin_score ?? ms,
        channel_score: ov.channel_score ?? cs,
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { store_id, product_id, margin_score, channel_score } = await req.json() as {
      store_id: string; product_id: string; margin_score?: number; channel_score?: number;
    };
    if (!store_id || !product_id) {
      return NextResponse.json({ error: "store_id, product_id 필수" }, { status: 400 });
    }

    await db.execute(`CREATE TABLE IF NOT EXISTS sellfit_discover_overrides (
      product_id TEXT NOT NULL,
      store_id   TEXT NOT NULL,
      margin_score  REAL,
      channel_score REAL,
      PRIMARY KEY (product_id, store_id)
    )`);

    await db.execute({
      sql: `INSERT INTO sellfit_discover_overrides (product_id, store_id, margin_score, channel_score)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(product_id, store_id) DO UPDATE SET
              margin_score  = COALESCE(excluded.margin_score,  margin_score),
              channel_score = COALESCE(excluded.channel_score, channel_score)`,
      args: [product_id, store_id, margin_score ?? null, channel_score ?? null],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
