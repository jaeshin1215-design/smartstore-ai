// D-60 트리거 첫 카드 수동 생성 스크립트
// 마이그레이션 후 첫 실행 — 오늘 기준 각 카테고리 D-60 카드 생성
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, "../.env.local"), "utf8").split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
const IZSTORY = "984f8d32-6d13-402a-b251-9bedaf0b1f6a";

// 트리거 설정 확인
const triggers = await db.execute({
  sql: `SELECT * FROM sellfit_trigger_configs WHERE store_id = ? AND is_active = 1`,
  args: [IZSTORY],
});
console.log(`트리거 설정 ${triggers.rows.length}개 확인:`);
triggers.rows.forEach(r => console.log(`  ${r.category_id}: base=${r.base_target_date}, offset=${r.days_offset}일`));

// 오늘 날짜
const today = new Date().toISOString().slice(0, 10);
const showUntil = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
console.log(`\n오늘: ${today}`);

// 마진 우선 정렬 기준
const MARGIN_PRIORITY = { 압축팩: 62, 화분: 58, 유아매트: 54, 다리미판: 48 };

// 현재 연도로 target_date 계산 (예: "03-15" → "2026-03-15")
function resolveTarget(mmdd) {
  const year = new Date().getFullYear();
  const full = `${year}-${mmdd}`;
  // 이미 지났으면 내년
  if (full < today) return `${year + 1}-${mmdd}`;
  return full;
}

const cards = triggers.rows
  .map(t => {
    const targetDate = resolveTarget(String(t.base_target_date));
    const triggerDate = new Date(new Date(targetDate).getTime() - Number(t.days_offset) * 86400000).toISOString().slice(0, 10);
    const daysLeft = Math.ceil((new Date(targetDate) - new Date(today)) / 86400000);
    return {
      triggerId: t.id,
      catName: String(t.category_name),
      targetDate,
      triggerDate,
      daysLeft,
      priority: MARGIN_PRIORITY[String(t.category_name)] ?? 40,
    };
  })
  .filter(t => today >= t.triggerDate && t.daysLeft > 0)
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 3);

console.log(`\n생성할 카드 ${cards.length}개:`);
for (const t of cards) {
  const title = `${t.catName} — D-${t.daysLeft} 준비 시작`;
  const reason = `${t.catName} 피크(${t.targetDate}) ${t.daysLeft}일 전 · 지금 소싱하면 장점 선점`;
  console.log(`  → ${title}`);
  await db.execute({
    sql: `INSERT OR REPLACE INTO sellfit_discover_cards
          (store_id, trigger_config_id, category_name, title, reason, priority_score, status, show_from, show_until)
          VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    args: [IZSTORY, t.triggerId, t.catName, title, reason, t.priority, today, showUntil],
  });
}

if (cards.length === 0) {
  // 오늘 기준 D-60 범위 밖이면 — 데모용으로 nearest future 카드 강제 생성
  console.log("오늘 기준 D-60 범위 없음. 데모용 카드 강제 생성 (show_from=today)");
  const demos = [
    { catName:"다리미판", daysLeft:39, priority:48 },
    { catName:"유아매트", daysLeft:56, priority:54 },
  ];
  const firstTrigger = triggers.rows.find(r => String(r.category_name) === "다리미판");
  const secondTrigger = triggers.rows.find(r => String(r.category_name) === "유아매트");
  if (firstTrigger) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO sellfit_discover_cards
            (store_id, trigger_config_id, category_name, title, reason, priority_score, status, show_from, show_until)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      args: [IZSTORY, firstTrigger.id, "다리미판", "다리미판 — D-39 준비 시작",
        "다리미판 설 연휴 피크(02-15) 39일 전 · 지금 소싱하면 장점 선점", 48, today, showUntil],
    });
    console.log("  → 다리미판 데모 카드 생성");
  }
  if (secondTrigger) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO sellfit_discover_cards
            (store_id, trigger_config_id, category_name, title, reason, priority_score, status, show_from, show_until)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      args: [IZSTORY, secondTrigger.id, "유아매트", "유아매트 — D-56 준비 시작",
        "유아매트 가을 이사 피크(09-01) 56일 전 · 지금 소싱하면 채널 선점", 54, today, showUntil],
    });
    console.log("  → 유아매트 데모 카드 생성");
  }
}

// 결과 확인
const result = await db.execute({
  sql: `SELECT id, category_name, title, status, show_from FROM sellfit_discover_cards WHERE store_id = ? ORDER BY priority_score DESC`,
  args: [IZSTORY],
});
console.log(`\n최종 카드 목록 (총 ${result.rows.length}개):`);
result.rows.forEach(r => console.log(`  [${r.status}] ${r.category_name}: ${r.title} (${r.show_from})`));
