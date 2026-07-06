import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 아이템 6: D-60 자동트리거 크론
// 호출: Vercel Cron → /api/cron/discover-engine (매일 03:00 KST)
// 조건: base_target_date(MM-DD) 기준 오늘부터 days_offset일 이내이면 카드 생성
// 제약: 하루 최대 3개 / 마진율 높은 카테고리 우선 / 동일 카테고리 3일 연속 금지

const MARGIN_PRIORITY: Record<string, number> = {
  압축팩: 62,   // 매입가 대비 마진율 높음
  화분: 58,
  유아매트: 54,
  다리미판: 48,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// MM-DD → 현재 연도 기준 YYYY-MM-DD
function resolveYear(mmdd: string): string {
  const year = new Date().getFullYear();
  return `${year}-${mmdd}`;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayStr();
  let created = 0;

  try {
    // 활성 트리거 가져오기
    const triggers = await db.execute(
      `SELECT * FROM sellfit_trigger_configs WHERE is_active = 1 ORDER BY id`
    );

    // 해당 카테고리가 최근 3일 연속 노출됐는지 체크
    const recentCards = await db.execute({
      sql: `SELECT category_name, show_from FROM sellfit_discover_cards
            WHERE status = 'active' AND show_from >= ? ORDER BY show_from DESC`,
      args: [addDays(today, -3)],
    });

    const recentMap: Record<string, string[]> = {};
    for (const r of recentCards.rows) {
      const cat = String(r.category_name);
      if (!recentMap[cat]) recentMap[cat] = [];
      recentMap[cat].push(String(r.show_from));
    }

    // 오늘 이미 생성된 카드 수
    const todayCount = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM sellfit_discover_cards WHERE show_from = ?`,
      args: [today],
    });
    const existingToday = Number(todayCount.rows[0]?.cnt ?? 0);
    const remaining = 3 - existingToday;
    if (remaining <= 0) {
      return NextResponse.json({ ok: true, created: 0, message: "오늘 최대 카드 수 도달" });
    }

    // 트리거 평가: 마진 우선 정렬
    const candidates = triggers.rows
      .map(t => ({
        id: Number(t.id),
        storeId: String(t.store_id),
        catId: String(t.category_id),
        catName: String(t.category_name),
        targetDate: resolveYear(String(t.base_target_date)),
        offset: Number(t.days_offset),
        priority: MARGIN_PRIORITY[String(t.category_name)] ?? 40,
      }))
      .filter(t => {
        const triggerDate = addDays(t.targetDate, -t.offset);
        const diff = Math.ceil((new Date(t.targetDate).getTime() - new Date(today).getTime()) / 86400000);
        return today >= triggerDate && diff > 0 && diff <= t.offset + 7;
      })
      .filter(t => {
        // 3일 연속 동일 카테고리 금지
        const days = recentMap[t.catName] ?? [];
        if (days.length < 3) return true;
        return days.slice(0, 3).some(d => d !== addDays(today, -1) && d !== addDays(today, -2) && d !== today);
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, remaining);

    for (const t of candidates) {
      const daysLeft = Math.ceil((new Date(t.targetDate).getTime() - new Date(today).getTime()) / 86400000);
      const title = `${t.catName} — D-${daysLeft} 준비 시작`;
      const reason = `${t.catName} 피크(${t.targetDate}) ${daysLeft}일 전 · 지금 소싱하면 장점 선점`;
      await db.execute({
        sql: `INSERT INTO sellfit_discover_cards
              (store_id, trigger_config_id, category_name, title, reason, priority_score, status, show_from, show_until)
              VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        args: [t.storeId, t.id, t.catName, title, reason, t.priority, today, addDays(today, 7)],
      });
      created++;
    }

    return NextResponse.json({ ok: true, created, today });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
