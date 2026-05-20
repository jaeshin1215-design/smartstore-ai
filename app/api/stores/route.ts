import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// 스토어 조회 (이메일 기준)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email 필요" }, { status: 400 });

  const result = await db.execute({
    sql: "SELECT * FROM sellfit_stores WHERE email = ? LIMIT 1",
    args: [email],
  });

  if (result.rows.length === 0) return NextResponse.json({ store: null });
  return NextResponse.json({ store: result.rows[0] });
}

// 스토어 등록
export async function POST(req: NextRequest) {
  const { name, email, kakao } = await req.json();
  if (!name) return NextResponse.json({ error: "스토어 이름 필요" }, { status: 400 });

  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO sellfit_stores (id, name, email, kakao) VALUES (?, ?, ?, ?)",
    args: [id, name, email || null, kakao || null],
  });

  return NextResponse.json({ ok: true, id });
}
