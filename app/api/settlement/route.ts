export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { processSettlement, SETTLEMENT_HEADERS } from "@/lib/settlement-process";

// T6 정산매출 정제 (박혜미) — 사방넷 정산매출 원본 엑셀 업로드 → 손익 계산 정제 파일 생성.
//   IZ 전용(세션 필요). format=json → 요약 / 그 외 → 정제후 32열 엑셀 다운로드.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

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

  const result = processSettlement(rawRows);

  if (format === "json") {
    return NextResponse.json({
      row_count: result.outRows.length,
      error_count: result.errors.length,
      errors: result.errors.slice(0, 20),
      unresolved_channels: result.unresolvedChannels,
      channels: result.channels.map((c) => ({
        channel: c.channel, count: c.count, AA: Math.round(c.AA), AB: Math.round(c.AB), U: Math.round(c.U),
        margin: Math.round(c.AA - c.AB), marginPct: c.AA > 0 ? +(((c.AA - c.AB) / c.AA) * 100).toFixed(1) : 0,
        mode: c.mode, multiplier: c.multiplier, resolved: c.resolved,
      })),
      totals: {
        count: result.totals.count, AA: Math.round(result.totals.AA), AB: Math.round(result.totals.AB), U: Math.round(result.totals.U),
        margin: Math.round(result.totals.AA - result.totals.AB),
        marginPct: result.totals.AA > 0 ? +(((result.totals.AA - result.totals.AB) / result.totals.AA) * 100).toFixed(1) : 0,
      },
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
    },
  });
}
