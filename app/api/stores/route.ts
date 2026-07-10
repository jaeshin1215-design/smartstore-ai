import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 스토어 조회
// - 웹 세션: 세션의 store_id만 반환 (pin/email 파라미터 무시 — 타 스토어 열람 차단, 2026-07-10)
// - 확장 토큰 경로: 세션이 없고 x-extension-token이 검증된 요청만 pin 조회 허용 (미들웨어에서 검증)
export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (session) {
    const result = await db.execute({
      sql: "SELECT * FROM sellfit_stores WHERE id = ? LIMIT 1",
      args: [session.storeId],
    });
    return NextResponse.json({ store: result.rows[0] ?? null });
  }

  // 세션 없음 = 확장 토큰 경로 (미들웨어가 x-extension-token 검증 후 통과시킴)
  const pin = req.nextUrl.searchParams.get("pin");
  if (pin) {
    const result = await db.execute({
      sql: "SELECT * FROM sellfit_stores WHERE pin = ? LIMIT 1",
      args: [pin],
    });
    return NextResponse.json({ store: result.rows[0] ?? null });
  }

  return NextResponse.json({ error: "세션 또는 확장 토큰 필요" }, { status: 400 });
}

// 스토어 신규 등록 (스토어 없는 계정의 최초 등록용)
export async function POST(req: NextRequest) {
  const { name, email, kakao } = await req.json();
  if (!name) return NextResponse.json({ error: "스토어 이름 필요" }, { status: 400 });

  const id = randomUUID();
  const pin = generatePin();

  await db.execute({
    sql: "INSERT INTO sellfit_stores (id, name, email, kakao, pin) VALUES (?, ?, ?, ?, ?)",
    args: [id, name, email || null, kakao || null, pin],
  });

  return NextResponse.json({ ok: true, id, pin });
}
