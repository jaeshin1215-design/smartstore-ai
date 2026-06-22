import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    await db.execute(`ALTER TABLE mezzanine_brands ADD COLUMN month INTEGER DEFAULT 0`);
  } catch { /* 이미 존재 */ }
  return NextResponse.json({ ok: true, message: "month 컬럼 추가 완료 (DEFAULT 0 = 미배정)" });
}
