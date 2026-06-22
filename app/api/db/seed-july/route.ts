import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const JULY_SEEDS = [
  // ── F&B 헤드라이너 6 (role=headliner, category=bakery_fb)
  { name: "연주방 어페어",     handle: "@yeonjuvin_affair",   followers: 4553,    role: "headliner", category: "bakery_fb",      region: "서북권" },
  { name: "더코너샵",          handle: "@the.coner.shop",     followers: 3170,    role: "headliner", category: "bakery_fb",      region: "서북권" },
  { name: "브루브루",          handle: "@brewbrew",           followers: 3502439, role: "headliner", category: "bakery_fb",      region: "서북권" },
  { name: "공작 퓨전비스트로", handle: "@gongzak_duke",       followers: 908,     role: "headliner", category: "bakery_fb",      region: "서북권" },
  { name: "얍",                handle: "@yap_bar_official",   followers: 723,     role: "headliner", category: "bakery_fb",      region: "서북권" },
  { name: "비스트로연남",      handle: "@bistroyonam",        followers: 675,     role: "headliner", category: "bakery_fb",      region: "서북권" },
  // ── 타깃 파트너 6 (role=target, category=camping_outdoor, 벤딕트 제외)
  { name: "아버아웃도어",      handle: "@arbor_outdoor",      followers: 8507,    role: "target",    category: "camping_outdoor", region: "전국" },
  { name: "트루버",            handle: "@truver_official",    followers: 8120,    role: "target",    category: "camping_outdoor", region: "전국" },
  { name: "노스피크",          handle: "@northpeak_official", followers: 6297,    role: "target",    category: "camping_outdoor", region: "전국" },
  { name: "O₂ archive",       handle: "@oxygen2.archive",    followers: 5038,    role: "target",    category: "camping_outdoor", region: "전국" },
  { name: "campingkeep",       handle: "@campingkeep",        followers: 4334,    role: "target",    category: "camping_outdoor", region: "전국" },
  { name: "고싸머기어",        handle: "@gossamergear_kr",    followers: 2825,    role: "target",    category: "camping_outdoor", region: "전국" },
] as const;

export async function POST() {
  const log: string[] = [];
  let inserted = 0, skipped = 0;

  for (const seed of JULY_SEEDS) {
    const existing = await db.execute({
      sql: "SELECT id FROM mezzanine_brands WHERE instagram_handle = ? LIMIT 1",
      args: [seed.handle],
    });
    if (existing.rows.length > 0) {
      log.push(`SKIP: ${seed.name} (${seed.handle}) — 이미 존재`);
      skipped++;
      continue;
    }

    const id         = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const core_info  = JSON.stringify({ followers: seed.followers, popup_count: 0, region: seed.region });

    await db.execute({
      sql: `INSERT INTO mezzanine_brands
              (id, name, instagram_handle, category, dong, season, month, role,
               followers, popup_count, region, source_type, core_info, dynamic_filters,
               matrix_x, matrix_y, gemini_reason, contact_status, status, url, verified_at)
            VALUES (?, ?, ?, ?, 'TBD', '', 7, ?, ?, 0, ?, 'MANUAL', ?, '{}', 50, 50, '', 'untouched', 'MANUAL_VERIFIED', '', datetime('now'))`,
      args: [id, seed.name, seed.handle, seed.category, seed.role, seed.followers, seed.region, core_info],
    });

    log.push(`INSERT: ${seed.name} (${seed.handle}) — role=${seed.role}, followers=${seed.followers.toLocaleString()}`);
    inserted++;
  }

  return NextResponse.json({ ok: true, inserted, skipped, total: JULY_SEEDS.length, log });
}
