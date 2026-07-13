export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { fetchSabangnetOrders, composeProductName, kstTodayCompact, normalizePhone } from "@/lib/sabangnet/orders";
import { getSession, requireIntegrationStore } from "@/lib/auth";
import { maskPhone, maskAddr } from "@/lib/privacy";

// 수도꼭지 1 — 오늘 주문 → CJ 송장프로그램 업로드 엑셀 (11컬럼, 순서 고정)
// 원본 개인정보는 이 다운로드 파일에만 담긴다 (화면 표시는 마스킹 원칙)

const HEADERS = [
  "수취인", "주소", "수취인전화번호", "수취인핸드폰번호", "수량", "상품명",
  "배송메시지", "쇼핑몰주문번호", "매출처명", "주문번호", "우편번호",
] as const;

export async function GET(req: NextRequest) {
  if (!(await requireIntegrationStore(req))) {
    return NextResponse.json({ error: "이 스토어에서는 연동 기능을 사용할 수 없습니다." }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get("date") ?? kstTodayCompact();
  const format = req.nextUrl.searchParams.get("format") ?? "xlsx";
  // 스토어 스코핑: 클라이언트 파라미터가 아니라 세션의 store_id (2026-07-09)
  const session = await getSession(req);
  const storeId = session?.storeId ?? null;
  if (!/^\d{8}$/.test(date)) {
    return NextResponse.json({ error: "date는 yyyyMMdd 형식" }, { status: 400 });
  }

  try {
    const orders = await fetchSabangnetOrders(date, date);

    // 미리보기 (화면 표시) — 전화·주소 마스킹 규칙 적용, 이름·상품명·주문번호는 원본 (2026-07-10)
    if (format === "json") {
      return NextResponse.json({
        date,
        order_count: orders.length,
        preview: orders.slice(0, 5).map((o) => ({
          receiver: o.RECEIVER_NM ?? "",
          product: composeProductName(o),
          shop: o.SHOP_NM ?? "",
          phone: maskPhone(o.RECEIVER_TEL),
          addr: maskAddr(o.RECEIVER_ADDR),
        })),
      });
    }

    if (orders.length === 0) {
      return NextResponse.json({ error: `${date} 주문 없음` }, { status: 404 });
    }

    // 11컬럼 매핑 — 전부 문자열로 (우편번호 앞자리 0 보존, 실측 148건 근거)
    // 수취인핸드폰번호 = RECEIVER_CEL (2026-07-13 심유나 프로 회신 확정, 프로브로 필드 실재 확인).
    // 사방넷이 빈 번호를 "- -" 더미로 주는 케이스 실측 → normalizePhone으로 정리하고,
    // CEL이 실질 비면 TEL로 채움 (CJ 업로드 전화번호 빈칸 방지 — 기존 복제 동작 유지 취지)
    const rows = orders.map((o) => [
      o.RECEIVER_NM ?? "",
      o.RECEIVER_ADDR ?? "",
      normalizePhone(o.RECEIVER_TEL),
      normalizePhone(o.RECEIVER_CEL) || normalizePhone(o.RECEIVER_TEL),
      String(o.ORD_CNT ?? ""), // 임시 확정: ORD_CNT (최종은 심유나 프로 확인)
      composeProductName(o),   // 실측 4/4 확정: PRD_ABBR + 옵션(단품 제외)
      o.DELIVERY_MSG ?? "",
      o.SHOP_ORD_NO ?? "",
      o.SHOP_NM ?? "",
      o.SB_ORD_NO ?? "",
      String(o.RECEIVER_ZIPCODE ?? ""),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "주문서확인처리_@cj택배");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    // 다운로드 이력 로그 (sellfit_events)
    if (storeId) {
      try {
        await db.execute({
          sql: `INSERT INTO sellfit_events (id, store_id, event_type, new_value, note, event_date)
                VALUES (?, ?, 'cj_excel_download', ?, ?, ?)`,
          args: [randomUUID(), storeId, String(rows.length), `CJ 송장 엑셀 ${date}`, date],
        });
      } catch { /* 로그 실패는 다운로드를 막지 않음 */ }
    }

    const filename = `${date}_주문서확인처리_@cj택배.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Row-Count": String(rows.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
