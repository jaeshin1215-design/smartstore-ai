import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/auth";
import { db } from "@/lib/db";

// 아이템 6: 활성 discover_cards 조회 → DiscoverTab 발굴현황에 편입
export async function GET(req: NextRequest) {
  const storeId = await resolveStoreId(req, req.nextUrl.searchParams.get("store_id"));
  if (!storeId) return NextResponse.json({ cards: [] });

  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await db.execute({
      sql: `SELECT id, category_name, title, reason, priority_score, show_from
            FROM sellfit_discover_cards
            WHERE store_id = ? AND status = 'active'
              AND show_from <= ? AND (show_until IS NULL OR show_until >= ?)
            ORDER BY priority_score DESC, show_from DESC
            LIMIT 10`,
      args: [storeId, today, today],
    });

    const cards = res.rows.map(r => ({
      id: `d60-${r.id}`,
      name: String(r.title),
      category: String(r.category_name),
      status: "D-60" as const,
      reason: String(r.reason),
      keyword: String(r.category_name),
    }));

    return NextResponse.json({ cards });
  } catch (e) {
    return NextResponse.json({ cards: [], error: String(e) });
  }
}

// 카드 상태 업데이트 (dismissed / acted)
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id: number; status: "dismissed" | "acted" };
    const sessionStoreId = await resolveStoreId(req, null); // 소유권 검증 (2026-07-14)
    if (!sessionStoreId) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    await db.execute({
      sql: `UPDATE sellfit_discover_cards SET status = ? WHERE id = ? AND store_id = ?`,
      args: [status, id, sessionStoreId],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
