import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 아이템 6: D-60 자동트리거 — trigger_configs + discover_cards 테이블 생성
// base_target_dates 제안 (DataLab 계절 패턴 기반):
//   압축팩   → 봄 이사철 03-15 / 장마 07-15 (D-60: 01-15 / 05-15)
//   화분     → 봄 원예   03-01          (D-60: 01-01)
//   유아매트 → 봄 이사   03-01 / 가을 09-01 (D-60: 01-01 / 07-01)
//   다리미판 → 설 연휴   02-15          (D-60: 12-16 전년도)

export async function POST() {
  const run = async (sql: string) => { try { await db.execute(sql); } catch { /* 이미 존재 */ } };

  // 트리거 설정 테이블
  await run(`CREATE TABLE IF NOT EXISTS sellfit_trigger_configs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id    TEXT    NOT NULL,
    category_id TEXT    NOT NULL,
    category_name TEXT  NOT NULL,
    base_target_date TEXT NOT NULL,
    days_offset INTEGER NOT NULL DEFAULT 60,
    engine_type TEXT    NOT NULL DEFAULT 'datalab',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  // 발굴 카드 테이블
  await run(`CREATE TABLE IF NOT EXISTS sellfit_discover_cards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id    TEXT    NOT NULL,
    trigger_config_id INTEGER NOT NULL,
    category_name TEXT  NOT NULL,
    title       TEXT    NOT NULL,
    reason      TEXT    NOT NULL,
    priority_score INTEGER NOT NULL DEFAULT 0,
    status      TEXT    NOT NULL DEFAULT 'active',
    show_from   TEXT    NOT NULL,
    show_until  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  // 이지스토리 기본 트리거 설정 시드 (중복 방지: 이미 있으면 INSERT OR IGNORE)
  const IZSTORY = "984f8d32-6d13-402a-b251-9bedaf0b1f6a";
  const seeds = [
    { cid:"압축팩_봄",   name:"압축팩",   date:"03-15" },
    { cid:"압축팩_장마",  name:"압축팩",   date:"07-15" },
    { cid:"화분_봄",    name:"화분",    date:"03-01" },
    { cid:"유아매트_봄",  name:"유아매트",  date:"03-01" },
    { cid:"유아매트_가을", name:"유아매트",  date:"09-01" },
    { cid:"다리미판_설",  name:"다리미판",  date:"02-15" },
  ];
  for (const s of seeds) {
    await run(`INSERT OR IGNORE INTO sellfit_trigger_configs
      (store_id, category_id, category_name, base_target_date, days_offset, engine_type, is_active)
      VALUES ('${IZSTORY}', '${s.cid}', '${s.name}', '${s.date}', 60, 'datalab', 1)`);
  }

  return NextResponse.json({ ok: true, message: "discover 마이그레이션 완료 (trigger_configs + discover_cards)" });
}
