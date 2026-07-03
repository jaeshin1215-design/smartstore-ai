import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.DOMEGGOOK_API_KEY!;
const BASE = "https://domeggook.com/ssl/api/";

// price.dome 형식: "7900" 또는 "1+9700|3+9500" (수량별 티어)
function parseSupplyPriceMin(dome: string | number): number {
  const s = String(dome ?? "0");
  if (!s || s === "0") return 0;
  if (s.includes("|") || s.includes("+")) {
    const firstTier = s.split("|")[0];
    const parts = firstTier.split("+");
    return parseInt(parts[parts.length - 1] ?? "0", 10);
  }
  return parseInt(s, 10);
}

function calcMarginPct(cost: number, sell: number): number {
  if (!cost || !sell || sell <= cost) return 0;
  return Math.round(((sell - cost) / sell) * 100);
}

// ── 네이버 쇼핑 최저가 → 중앙값 (서버사이드 전용) ──────────────────────────
// 매입가(costPrice) 이하 미끼상품 제외, 상위 N개 중앙값 사용
async function fetchNaverShopMedianPrice(
  title: string,
  costPrice: number
): Promise<number | null> {
  const clientId     = process.env.NAVER_CLIENT_ID!;
  const clientSecret = process.env.NAVER_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    console.log("[naver_shop] SKIP: 환경변수 없음");
    return null;
  }

  // 제목에서 핵심 키워드 추출: 대괄호 제거 후 앞 3단어
  const query = title
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");

  if (!query) {
    console.log("[naver_shop] SKIP: 빈 쿼리");
    return null;
  }

  console.log(`[naver_shop] 호출 query="${query}" costPrice=${costPrice}`);

  try {
    const url = new URL("https://openapi.naver.com/v1/search/shop.json");
    url.searchParams.set("query", query);
    url.searchParams.set("display", "10");
    url.searchParams.set("sort", "sim");

    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id":     clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.log(`[naver_shop] HTTP ${res.status} 실패`);
      return null;
    }

    const json = await res.json() as { items?: { lprice: string }[] };
    const allPrices = (json.items ?? []).map(item => Number(item.lprice));
    console.log(`[naver_shop] 원본 prices(${allPrices.length}):`, allPrices);

    // 매입가 이하 제외
    const prices = allPrices.filter(p => p > 0 && p > costPrice).sort((a, b) => a - b);
    console.log(`[naver_shop] 필터 후(${prices.length}):`, prices);

    if (prices.length === 0) {
      console.log("[naver_shop] 필터 후 0건 → null");
      return null;
    }

    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0
      ? Math.round((prices[mid - 1] + prices[mid]) / 2)
      : prices[mid];

    console.log(`[naver_shop] 중앙값=${median}`);
    return median;
  } catch (e) {
    console.log("[naver_shop] 예외:", e);
    return null;
  }
}

type RawItem = Record<string, unknown>;

// supply fallback threshold: supply가 이 배율 초과일 때만 sellPrice로 인정
// 1.01 = 공급가 대비 1% 초과면 허용 (너무 엄격한 1.05에서 완화)
const SUPPLY_PRICE_THRESHOLD = 1.01;

// ── getItemList 응답 정규화 ──────────────────────────────────────────────
// 응답구조: json.domeggook.list.item[]: { no, title, thumb, price(숫자) }
function normalizeListItem(raw: RawItem) {
  const thumb = String(raw.thumb ?? raw.img ?? "");
  return {
    no:         String(raw.no ?? ""),
    name:       String(raw.title ?? raw.name ?? ""),
    category:   String(raw.cat ?? raw.category ?? ""),
    thumb:      thumb || undefined,
    sell_price: 0,
    margin_pct: 0,
    margin_source: "unknown" as const,
  };
}

// ── getItemView 응답 정규화 (async: 네이버 쇼핑 fallback 포함) ──────────
// price.dome         = 공급가 (내가 지불하는 비용, 숨김)
// price.resale.Recommand = 재판매 권장가 (최우선)
// price.supply       = 도매꾹 직접 판매가 (매입가와 거의 같음, fallback 불가)
// → fallback: 네이버 쇼핑 중앙값
// searchKeyword: 사용자가 Discover 탭에 입력한 키워드 (상품명보다 넓은 시장가 조회에 사용)
async function normalizeDetailItem(dome: RawItem, searchKeyword?: string) {
  const basis  = (dome.basis ?? {}) as RawItem;
  const price  = (dome.price ?? {}) as RawItem;
  const resale = (price.resale ?? {}) as RawItem;

  const costPrice = parseSupplyPriceMin(price.dome as string | number);
  const title     = String(basis.title ?? basis.name ?? "");

  let sellPrice   = 0;
  let marginSource: "resale" | "naver_shop" | "supply" | "unknown" = "unknown";

  const resaleRecommand = Number(resale.Recommand ?? resale.recommand ?? 0);
  const resaleMinimum   = Number(resale.minimum ?? 0);

  if (resaleRecommand > costPrice) {
    sellPrice    = resaleRecommand;
    marginSource = "resale";
  } else if (resaleMinimum > costPrice) {
    sellPrice    = resaleMinimum;
    marginSource = "resale";
  } else {
    // 사용자 검색 키워드 우선, 없으면 상품명에서 추출
    const naverQuery = searchKeyword ?? title;
    const naverMedian = await fetchNaverShopMedianPrice(naverQuery, costPrice);
    if (naverMedian && naverMedian > costPrice) {
      sellPrice    = naverMedian;
      marginSource = "naver_shop";
    } else {
      const supplyPrice = Number(price.supply ?? 0);
      if (supplyPrice > costPrice * SUPPLY_PRICE_THRESHOLD) {
        sellPrice    = supplyPrice;
        marginSource = "supply";
      }
    }
  }

  const marginPct = calcMarginPct(costPrice, sellPrice);

  const thumb = String(
    (dome.imgs as RawItem)?.main ?? (dome.img as RawItem)?.src ?? basis.thumb ?? ""
  );

  return {
    no:            String(basis.no ?? dome.no ?? ""),
    name:          title,
    category:      String(basis.cat ?? ""),
    status:        String(basis.status ?? ""),
    thumb:         thumb || undefined,
    sell_price:    sellPrice,
    margin_pct:    marginPct,
    margin_source: marginSource,
    // costPrice(공급가)는 절대 클라이언트에 노출하지 않음 (도매꾹 ToS)
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mode: string; keyword?: string; no?: string; page?: number; searchKeyword?: string };
    const { mode } = body;

    // ── search: 키워드 → 상품 목록 (마진 계산 없음) ────────────────────
    if (mode === "search") {
      const { keyword, page = 1 } = body;
      if (!keyword) return NextResponse.json({ error: "keyword 필요" }, { status: 400 });

      const url = new URL(BASE);
      url.searchParams.set("ver", "4.1");
      url.searchParams.set("mode", "getItemList");
      url.searchParams.set("aid", API_KEY);
      url.searchParams.set("market", "dome");
      url.searchParams.set("om", "json");
      url.searchParams.set("kw", keyword);
      url.searchParams.set("sz", "20");
      url.searchParams.set("pg", String(page));
      url.searchParams.set("so", "rd");

      const res  = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json() as Record<string, unknown>;

      if (json?.errors) {
        const err = json.errors as Record<string, unknown>;
        console.error("[domeggook search error]", err);
        return NextResponse.json(
          { error: String(err.message ?? "도매꾹 오류"), code: String(err.dcode ?? err.code ?? "") },
          { status: 400 }
        );
      }

      const dome      = (json?.domeggook ?? {}) as RawItem;
      const header    = (dome.header ?? {}) as RawItem;
      const list      = (dome.list ?? {}) as RawItem;
      const rawItems  = Array.isArray(list.item) ? list.item as RawItem[] : [];
      const items     = rawItems.map(normalizeListItem);
      const total     = Number(header.numberOfItems ?? rawItems.length);

      return NextResponse.json({ items, total });
    }

    // ── detail: 상품 상세 + 마진 계산 (상품 클릭 시에만 호출) ──────────
    if (mode === "detail") {
      const { no } = body;
      if (!no) return NextResponse.json({ error: "no 필요" }, { status: 400 });

      const url = new URL(BASE);
      url.searchParams.set("ver", "4.6");
      url.searchParams.set("mode", "getItemView");
      url.searchParams.set("aid", API_KEY);
      url.searchParams.set("om", "json");
      url.searchParams.set("no", no);

      const res  = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json() as Record<string, unknown>;

      if (json?.errors) {
        const err = json.errors as Record<string, unknown>;
        console.error("[domeggook detail error]", err);
        return NextResponse.json(
          { error: String(err.message ?? "도매꾹 오류"), code: String(err.dcode ?? err.code ?? "") },
          { status: 400 }
        );
      }

      const dome = (json?.domeggook ?? json) as RawItem;
      const item = await normalizeDetailItem(dome, body.searchKeyword);
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: "mode 오류: search | detail" }, { status: 400 });
  } catch (e) {
    console.error("[domeggook]", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
