import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 더미·테스트 레코드 정리: nonexistent_brand_zzz999_test, aromatica_kr
export async function POST() {
  const log: string[] = [];
  try {
    const result = await db.execute(`
      DELETE FROM mezzanine_brands
      WHERE url  LIKE '%nonexistent%'
         OR name LIKE '%zzz999%'
         OR instagram_handle = 'aromatica_kr'
         OR url  LIKE '%aromatica_kr%'
    `);
    log.push(`✅ 더미 레코드 삭제: ${result.rowsAffected ?? "?"}건`);
  } catch (e) {
    log.push(`⚠️ 삭제 실패: ${String(e)}`);
  }
  return NextResponse.json({ ok: true, log });
}
