import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveStoreId } from "@/lib/auth";

// sellfit_events: 가격결정 이력 로그 테이블 (2026-07-07 신설)
// event_type 확장 가능 구조 — 향후 광고비 변경·프로모션 이력도 동일 테이블에 적재
// payload 컬럼: event_type별 추가 필드를 JSON으로 담음
const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS sellfit_events (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    product_name TEXT,
    purchase_price INTEGER,
    competitor_price INTEGER,
    recommended_price INTEGER,
    min_price INTEGER,
    max_price INTEGER,
    margin_rate INTEGER,
    payload TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
`;

export async function POST(req: NextRequest) {
  const {
    event_type, product_name,
    purchase_price, competitor_price,
    recommended_price, min_price, max_price, margin_rate,
    payload, ...rest
  } = await req.json();

  const store_id = await resolveStoreId(req, rest.store_id ?? null); // 세션 강제 (2026-07-14)
  if (!store_id) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (!event_type) {
    return NextResponse.json({ error: "event_type 필수" }, { status: 400 });
  }

  try {
    await db.execute(CREATE_TABLE);
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO sellfit_events
              (id, store_id, event_type, product_name, purchase_price, competitor_price,
               recommended_price, min_price, max_price, margin_rate, payload)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id, store_id, event_type,
        product_name ?? null, purchase_price ?? null, competitor_price ?? null,
        recommended_price ?? null, min_price ?? null, max_price ?? null, margin_rate ?? null,
        payload ? JSON.stringify(payload) : null,
      ],
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
