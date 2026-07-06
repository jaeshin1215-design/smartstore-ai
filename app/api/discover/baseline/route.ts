import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 아이템 3: 이지스토리 등록 상품을 DiscoverMatrix 상시 데이터소스로
// 마진: (price - purchase_price) / price × 100 → score = min(100, pct × 2)
// 채널: 카테고리명 regex 매칭 (DiscoverTab CHANNEL_RULES와 동일)

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
function channelScore(kw: string): number {
  for (const r of CH_RULES) if (r.re.test(kw)) return r.score;
  return 50;
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
    const items = res.rows.map(r => {
      const sell = Number(r.price) || 0;
      const buy  = Number(r.purchase_price) || 0;
      const pct  = sell > 0 ? (sell - buy) / sell * 100 : 0;
      const ms   = Math.min(100, Math.round(pct * 2));
      const kw   = String(r.keyword || r.name || "");
      const cs   = channelScore(kw);
      return { id: String(r.id), name: String(r.name || ""), category: String(r.category || ""), margin_score: ms, channel_score: cs };
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) });
  }
}
