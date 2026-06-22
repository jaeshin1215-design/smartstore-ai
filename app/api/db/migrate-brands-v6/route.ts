import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// v6: 무도장 실명 강등 + verified_at 도입 + 미확인 목록 반환
export async function POST() {
  const log: string[] = [];
  const suspects: { name: string; id: string; followers: number; popup_count: number; created_at: string }[] = [];

  // 1. verified_at 컬럼 추가 (이미 있으면 무시)
  try {
    await db.execute(`ALTER TABLE mezzanine_brands ADD COLUMN verified_at TEXT DEFAULT NULL`);
    log.push("✅ verified_at 컬럼 추가");
  } catch {
    log.push("⏭ verified_at 이미 존재");
  }

  // 2. 오방가르드·yongqi ombres → ai_draft 강등 (데이터 보존, 표시 등급만 하향)
  try {
    const demote = await db.execute(`
      UPDATE mezzanine_brands
      SET status = 'ai_draft', verified_at = NULL
      WHERE name IN ('오방가르드', 'yongqi ombres')
    `);
    log.push(`✅ 무도장 강등: ${demote.rowsAffected ?? 0}건 (오방가르드·yongqi ombres)`);
  } catch (e) {
    log.push(`⚠️ 강등 실패: ${String(e)}`);
  }

  // 3. 사람 입력 증거 있는 MANUAL_VERIFIED → verified_at 소급 기록
  //    증거 기준: followers > 0 OR popup_count > 0 (폼에서 숫자 직접 입력한 것)
  try {
    const stamp = await db.execute(`
      UPDATE mezzanine_brands
      SET verified_at = created_at
      WHERE status = 'MANUAL_VERIFIED'
        AND verified_at IS NULL
        AND (followers > 0 OR popup_count > 0)
    `);
    log.push(`✅ verified_at 소급: ${stamp.rowsAffected ?? 0}건`);
  } catch (e) {
    log.push(`⚠️ verified_at 소급 실패: ${String(e)}`);
  }

  // 4. 증거 없는 MANUAL_VERIFIED 목록 수집 → Jae 판단용 회신
  try {
    const unverified = await db.execute(`
      SELECT id, name, instagram_handle, category, followers, popup_count, created_at
      FROM mezzanine_brands
      WHERE status = 'MANUAL_VERIFIED'
        AND (verified_at IS NULL)
        AND name NOT LIKE 'AI 발굴 후보%'
      ORDER BY created_at DESC
    `);
    for (const row of unverified.rows as Record<string, unknown>[]) {
      suspects.push({
        name:        String(row.name        ?? ""),
        id:          String(row.id          ?? ""),
        followers:   Number(row.followers   ?? 0),
        popup_count: Number(row.popup_count ?? 0),
        created_at:  String(row.created_at  ?? ""),
      });
    }
    if (suspects.length > 0) {
      log.push(`⚠️ 도장 증거 없는 MANUAL_VERIFIED ${suspects.length}건 → Jae 판단 필요`);
    } else {
      log.push("✅ 미확인 MANUAL_VERIFIED 0건");
    }
  } catch (e) {
    log.push(`⚠️ 미확인 목록 조회 실패: ${String(e)}`);
  }

  return NextResponse.json({ ok: true, log, suspects });
}
