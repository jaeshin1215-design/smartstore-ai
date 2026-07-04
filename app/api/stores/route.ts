import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 스토어 조회 — ?pin=XXXXXX 또는 ?email=...
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");
  const email = req.nextUrl.searchParams.get("email");

  if (pin) {
    const result = await db.execute({
      sql: "SELECT * FROM sellfit_stores WHERE pin = ? LIMIT 1",
      args: [pin],
    });
    if (result.rows.length === 0) return NextResponse.json({ store: null });
    return NextResponse.json({ store: result.rows[0] });
  }

  if (email) {
    const result = await db.execute({
      sql: "SELECT * FROM sellfit_stores WHERE email = ? LIMIT 1",
      args: [email],
    });
    if (result.rows.length === 0) return NextResponse.json({ store: null });
    return NextResponse.json({ store: result.rows[0] });
  }

  return NextResponse.json({ error: "pin 또는 email 필요" }, { status: 400 });
}

// 스토어 등록
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
