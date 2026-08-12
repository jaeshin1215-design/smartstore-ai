export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession, requireIntegrationStore } from "@/lib/auth";
import { processSettlement, SETTLEMENT_HEADERS } from "@/lib/settlement-process";
import { db } from "@/lib/db";

// T6 정산매출 정제 (박혜미) — 사방넷 정산매출 원본 엑셀 업로드 → 손익 계산 정제 파일 생성.
//   IZ 전용(세션 필요). format=json → 요약 / 그 외 → 정제후 32열 엑셀 다운로드.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  // IZ 전용 — 주석과 코드 일치 (2026-07-20 Phase 3). 임퍼소네이션 읽기전용도 여기서 차단됨.
  if (!(await requireIntegrationStore(req))) {
    return NextResponse.json({ error: "이 기능은 해당 스토어에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "xlsx";
  let rawRows: Record<string, unknown>[];
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "엑셀 파일을 첨부해주세요." }, { status: 400 });
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  } catch {
    return NextResponse.json({ error: "엑셀 파싱 실패 — 사방넷 정산매출 원본 파일인지 확인해주세요." }, { status: 400 });
  }
  if (rawRows.length === 0) return NextResponse.json({ error: "데이터 행이 없습니다." }, { status: 400 });

  // 실출고배송비 대응표 로드 (store 스코핑). 테이블 미생성/미등록이면 빈 맵 → 기존 동작 그대로.
  const ratesMap = new Map<string, number>();
  try {
    const rr = await db.execute({
      sql: "SELECT product_code, shipping_cost FROM sellfit_shipping_rates WHERE store_id = ?",
      args: [session.storeId],
    });
    for (const r of rr.rows) {
      const c = String(r.product_code ?? "").trim();
      const v = Number(r.shipping_cost);
      if (c && Number.isFinite(v)) ratesMap.set(c, v);
    }
  } catch { /* 테이블 미생성 → 빈 맵 (배포 전) */ }

  const result = processSettlement(rawRows, ratesMap);

  if (format === "json") {
    return NextResponse.json({
      row_count: result.outRows.length,
      input_row_count: rawRows.length,        // 원본 행수 (제외 전)
      excluded: result.excluded,              // 물류처 제외 규칙(스타배송)으로 빠진 행
      error_count: result.errors.length,
      errors: result.errors.slice(0, 20),
      unresolved_channels: result.unresolvedChannels,
      unresolved_product_codes: result.unresolvedProductCodes, // 배송비 미등록 품번 (빈칸 처리, 0 아님)
      channels: result.channels.map((c) => {
        const AI = c.AB + c.AH; // ★ 마진 원가 기준(AB+위탁배송비). 당사물류는 AH=0 → AI=AB
        return {
          channel: c.channel, count: c.count, AA: Math.round(c.AA), AB: Math.round(c.AB), U: Math.round(c.U),
          AH: Math.round(c.AH), AI: Math.round(AI),
          margin: Math.round(c.AA - AI), marginPct: c.AA > 0 ? +(((c.AA - AI) / c.AA) * 100).toFixed(1) : 0,
          mode: c.mode, multiplier: c.multiplier, resolved: c.resolved,
        };
      }),
      totals: (() => {
        const AI = result.totals.AB + result.totals.AH;
        return {
          count: result.totals.count, AA: Math.round(result.totals.AA), AB: Math.round(result.totals.AB), U: Math.round(result.totals.U),
          AH: Math.round(result.totals.AH), AI: Math.round(AI),
          margin: Math.round(result.totals.AA - AI),
          marginPct: result.totals.AA > 0 ? +(((result.totals.AA - AI) / result.totals.AA) * 100).toFixed(1) : 0,
        };
      })(),
    });
  }

  // 정제후 32열 엑셀 생성 (헤더 순서 고정, 물류처 예외 S·T·U는 빈칸 유지)
  const aoa = [
    [...SETTLEMENT_HEADERS],
    ...result.outRows.map((r) => SETTLEMENT_HEADERS.map((h) => r[h] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "정제후");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `정산매출_정제후_${new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Row-Count": String(result.outRows.length),
      "X-Error-Count": String(result.errors.length),
      "X-Excluded-Count": String(result.excluded.count),
    },
  });
}
