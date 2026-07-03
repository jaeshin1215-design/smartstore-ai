import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// 마진 완충선: 등록마진율 - 쿠팡마진율 차이가 이 값 초과 시 "위험"
// 근거: 부자재·로스 2% + 물류비 20% 감안한 보수적 기준
const MARGIN_BUFFER_THRESHOLD = 0.05;

function calcSafetyLevel(diff: number): "안전" | "주의" | "위험" {
  if (diff <= 0) return "안전";
  if (diff <= MARGIN_BUFFER_THRESHOLD) return "주의";
  return "위험";
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id 필요" }, { status: 400 });

  const result = await db.execute({
    sql: "SELECT * FROM sellfit_competitor_tracking WHERE store_id = ? ORDER BY check_date DESC, created_at DESC LIMIT 200",
    args: [storeId],
  });
  return NextResponse.json({ records: result.rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_id, product_name, coupang_price, is_item_winner, check_date } = body;

  if (!store_id || !product_name || !check_date) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const id = randomUUID();
  const coupangPriceNum = coupang_price ? Number(coupang_price) : null;

  // AI 판단 레이어: INSERT 전에 판단 먼저 수행
  let safetyLevel: "안전" | "주의" | "위험" | null = null;
  let registeredMarginPct: number | null = null;
  let coupangMarginPct: number | null = null;
  let marginDiffPct: number | null = null;
  let winnerTargetPrice: number | null = null;
  let judgmentReason = "상품 매입가·판매가 미등록";

  if (coupangPriceNum) {
    const productResult = await db.execute({
      sql: "SELECT price, purchase_price FROM sellfit_products WHERE store_id = ? AND name = ? AND is_own = 1 LIMIT 1",
      args: [store_id, product_name],
    });

    const row = productResult.rows[0];
    const price = row ? Number(row.price) : 0;
    const purchasePrice = row ? Number(row.purchase_price) : 0;

    if (price > 0 && purchasePrice > 0) {
      const registeredMargin = (price - purchasePrice) / price;
      const coupangMargin = (coupangPriceNum - purchasePrice) / coupangPriceNum;
      const diff = registeredMargin - coupangMargin;
      safetyLevel = calcSafetyLevel(diff);

      registeredMarginPct = Math.round(registeredMargin * 1000) / 10;
      coupangMarginPct = Math.round(coupangMargin * 1000) / 10;
      marginDiffPct = Math.round(diff * 1000) / 10;
      winnerTargetPrice = !is_item_winner
        ? Math.round(purchasePrice / (1 - registeredMargin))
        : null;

      judgmentReason =
        safetyLevel === "안전"
          ? "쿠팡 마진이 등록 마진 이상 — 현재 가격 유지 가능"
          : safetyLevel === "주의"
          ? `마진 차이 ${marginDiffPct}%p — 모니터링 필요`
          : `마진 차이 ${marginDiffPct}%p로 완충선(${MARGIN_BUFFER_THRESHOLD * 100}%p) 초과 — 가격 조정 검토`;
    }
  }

  await db.execute({
    sql: `INSERT INTO sellfit_competitor_tracking
      (id, store_id, product_name, coupang_price, is_item_winner, check_date,
       safety_level, registered_margin_pct, coupang_margin_pct, margin_diff_pct, winner_target_price, judgment_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, store_id, product_name, coupangPriceNum, is_item_winner ? 1 : 0, check_date,
      safetyLevel, registeredMarginPct, coupangMarginPct, marginDiffPct, winnerTargetPrice, judgmentReason,
    ],
  });

  return NextResponse.json({
    ok: true,
    id,
    judgment: {
      safety_level: safetyLevel,
      registered_margin_pct: registeredMarginPct,
      coupang_margin_pct: coupangMarginPct,
      margin_diff_pct: marginDiffPct,
      winner_target_price: winnerTargetPrice,
      reason: judgmentReason,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  await db.execute({ sql: "DELETE FROM sellfit_competitor_tracking WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
