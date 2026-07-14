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

// 교차 매칭 대상 물류처 — 정확히 이 두 문자열만 (패턴/접두사 금지, 2026-07-14 심유나 프로 확정)
const CROSS_MATCH_LOGISTICS = new Set(["오포물류", "오포_카노위탁"]);
// 주문번호 몸통 — 분리 suffix(-1, _2 등) 제거. 없으면 원본 그대로.
const orderBody = (shopOrdNo: string | null | undefined) => String(shopOrdNo ?? "").replace(/[-_]\d+$/, "").trim();

interface FilledRow {
  sbOrdNo: string;
  waybillNo: string;
  receiverNm: string; // 이름은 원본 표시 허용 (마스킹 규칙 확정본)
  productAbbr: string;
  logisticsNm: string; // 물류처명 — 업로드 전 업체별 확인용 (2026-07-14 심유나 프로)
  matched: true;       // 합배송 추정 자동매칭 결과 — UI 배경색 표시(눈으로 최종 확인)
}

// 매칭 규칙(T1+T4): 물류처 ∈ {오포물류, 오포_카노위탁}인 건만 대상(교차 매칭 허용).
// [주문번호 몸통 동일] OR [주소+수취인 동일] 이면 같은 그룹 → 송장있는 행 값을 없는 행에 복사.
// 그 외 물류처는 현행대로 직접 입력 유지(매칭 제외).
function matchWaybills(orders: SabangnetOrder[]) {
  const pool = orders.filter((o) => CROSS_MATCH_LOGISTICS.has(String(o.LOGISTICS_NM ?? "")));

  // Union-Find로 두 키(주문번호 몸통 / 주소+수취인)를 OR 병합
  const parent = pool.map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  const byOrder = new Map<string, number>();
  const byAddr = new Map<string, number>();
  pool.forEach((o, i) => {
    const ob = orderBody(o.SHOP_ORD_NO);
    if (ob) { const prev = byOrder.get(ob); if (prev != null) union(i, prev); else byOrder.set(ob, i); }
    const addr = String(o.RECEIVER_ADDR ?? "").trim();
    const nm = String(o.RECEIVER_NM ?? "").trim();
    if (addr && nm) { const ak = `${addr}|${nm}`; const prev = byAddr.get(ak); if (prev != null) union(i, prev); else byAddr.set(ak, i); }
  });

  const groups = new Map<number, SabangnetOrder[]>();
  pool.forEach((o, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(o); });

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
        logisticsNm: m.LOGISTICS_NM ?? "",
        matched: true,
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

    // 사방넷 업로드용 .xls — 필수 2컬럼(A 사방넷주문번호 / B 운송장번호)은 위치 고정,
    // 물류처명은 C열로 덧붙임(업로드 전 업체별 확인용, 2026-07-14 심유나 프로 요청).
    // 사방넷 업로드가 앞 2열만 읽으므로 C열은 무해 — 첫 실업로드 시 재확인 권장.
    const rows = result.filled.map((f) => [f.sbOrdNo, f.waybillNo, f.logisticsNm]);
    const ws = XLSX.utils.aoa_to_sheet([["사방넷주문번호", "운송장번호", "물류처명"], ...rows]);
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
