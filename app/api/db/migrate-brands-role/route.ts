import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const log: string[] = [];

  // ── 1. role 컬럼 추가
  try {
    await db.execute(`ALTER TABLE mezzanine_brands ADD COLUMN role TEXT DEFAULT 'target'`);
    log.push("role 컬럼 추가 완료");
  } catch { log.push("role 컬럼 이미 존재 (skip)"); }

  // ── 2. 6월 등록분 소급 (source_type=MANUAL, AI 발굴 후보 제외)
  //    bakery_fb → role=headliner, month=6
  const r1 = await db.execute({
    sql: `UPDATE mezzanine_brands
          SET role = 'headliner', month = 6
          WHERE source_type = 'MANUAL'
            AND category = 'bakery_fb'
            AND month = 0
            AND name NOT LIKE 'AI 발굴 후보%'`,
    args: [],
  });
  const headlinerCount = r1.rowsAffected ?? 0;
  log.push(`F&B 헤드라이너 소급: ${headlinerCount}건 (month=6, role=headliner)`);

  //    나머지(웰니스·바디케어 등) → role=target, month=6
  const r2 = await db.execute({
    sql: `UPDATE mezzanine_brands
          SET role = 'target', month = 6
          WHERE source_type = 'MANUAL'
            AND category != 'bakery_fb'
            AND month = 0
            AND name NOT LIKE 'AI 발굴 후보%'
            AND name != 'Vendict'`,
    args: [],
  });
  const targetCount = r2.rowsAffected ?? 0;
  log.push(`타깃 파트너 소급: ${targetCount}건 (month=6, role=target)`);

  // ── 3. 벤딕트 개별 교정
  const r3 = await db.execute({
    sql: `UPDATE mezzanine_brands
          SET role = 'target', category = 'camping_outdoor', month = 7
          WHERE name = 'Vendict'`,
    args: [],
  });
  const vendictFixed = r3.rowsAffected ?? 0;
  log.push(`벤딕트 교정: ${vendictFixed}건 (role=target, category=camping_outdoor, month=7)`);

  return NextResponse.json({
    ok: true,
    role_added: true,
    headliner_count: headlinerCount,
    target_count: targetCount,
    vendict_fixed: vendictFixed,
    log,
  });
}
