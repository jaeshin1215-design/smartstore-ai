export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { fetchSabangnetOrders, kstTodayCompact, type SabangnetOrder } from "@/lib/sabangnet/orders";
import { getSession, requireIntegrationStore } from "@/lib/auth";

// 수도꼭지 2 — 세트분리 송장 매칭 (관제탑 규칙, 자동화 100%)
// 1. 수취인 + 쇼핑몰주문번호 동일 그룹핑
// 2. 그룹 내 송장번호 있는 행의 값을 없는 행에 복사
// 3. [사방넷주문번호, 운송장번호] 2컬럼 파일 → 사방넷 업로드

const has = (v: string | null | undefined) => v != null && String(v).trim() !== "";

interface FilledRow {
  sbOrdNo: string;
  waybillNo: string;
  receiverNm: string; // 이름은 원본 표시 허용 (마스킹 규칙 확정본)
  productAbbr: string;
}

function matchWaybills(orders: SabangnetOrder[]) {
  const groups = new Map<string, SabangnetOrder[]>();
  for (const o of orders) {
    const key = `${o.RECEIVER_NM ?? ""}|${o.SHOP_ORD_NO ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  const filled: FilledRow[] = [];
  let fillableGroups = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const withWaybill = g.find((o) => has(o.WAYBILL_NO));
    const missing = g.filter((o) => !has(o.WAYBILL_NO));
    if (!withWaybill || missing.length === 0) continue;
    fillableGroups += 1;
    for (const m of missing) {
      filled.push({
        sbOrdNo: m.SB_ORD_NO ?? "",
        waybillNo: withWaybill.WAYBILL_NO!,
        receiverNm: m.RECEIVER_NM ?? "",
        productAbbr: m.PRD_ABBR ?? "",
      });
    }
  }
  return {
    totalGroups: groups.size,
    multiGroups: [...groups.values()].filter((g) => g.length > 1).length,
    fillableGroups,
    filled,
  };
}

export async function GET(req: NextRequest) {
  if (!(await requireIntegrationStore(req))) {
    return NextResponse.json({ error: "이 스토어에서는 연동 기능을 사용할 수 없습니다." }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get("date") ?? kstTodayCompact();
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  // 스토어 스코핑: 클라이언트 파라미터가 아니라 세션의 store_id (2026-07-09)
  const session = await getSession(req);
  const storeId = session?.storeId ?? null;
  if (!/^\d{8}$/.test(date)) {
    return NextResponse.json({ error: "date는 yyyyMMdd 형식" }, { status: 400 });
  }

  try {
    // 세트분리 행들은 주문일이 서로 다를 수 있어 (분리 시점 생성) 단일 날짜로는
    // 그룹이 쪼개진다 — 기준일 포함 최근 7일 범위로 조회 (2026-07-09 실측 근거)
    const end = date;
    const d = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`);
    const start = new Date(d.getTime() - 6 * 86400000).toISOString().slice(0, 10).replace(/-/g, "");
    const orders = await fetchSabangnetOrders(start, end);
    const result = matchWaybills(orders);

    if (format === "json") {
      // 검수용 요약 — 개인정보(전화·주소) 미포함이라 마스킹 불필요
      return NextResponse.json({
        date,
        order_count: orders.length,
        total_groups: result.totalGroups,
        multi_groups: result.multiGroups,
        fillable_groups: result.fillableGroups,
        filled_rows: result.filled.length,
        preview: result.filled.slice(0, 50),
      });
    }

    if (result.filled.length === 0) {
      return NextResponse.json({ error: "채울 송장이 없습니다 (매칭 0건)" }, { status: 404 });
    }

    // 사방넷 업로드용 2컬럼 .xls (원본 파일 관례: cs사방넷_송장_업로드용_파일.xls)
    const rows = result.filled.map((f) => [f.sbOrdNo, f.waybillNo]);
    const ws = XLSX.utils.aoa_to_sheet([["사방넷주문번호", "운송장번호"], ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "송장업로드");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer;

    if (storeId) {
      try {
        await db.execute({
          sql: `INSERT INTO sellfit_events (id, store_id, event_type, new_value, note, event_date)
                VALUES (?, ?, 'waybill_match_download', ?, ?, ?)`,
          args: [randomUUID(), storeId, String(rows.length), `세트분리 송장매칭 ${date}`, date],
        });
      } catch { /* 로그 실패는 다운로드를 막지 않음 */ }
    }

    const filename = `${date}_사방넷_송장_업로드용.xls`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Row-Count": String(rows.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
