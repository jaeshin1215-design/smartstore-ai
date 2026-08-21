export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { unzipSync, zipSync } from "fflate";
import { getSession } from "@/lib/auth";
import { parseOrderBuffer, buildCenterSheets, buildTemplateBook, summarize, arrivalParts, type ParsedPo } from "@/lib/coupang-po";

// 쿠팡 로켓배송 발주서 취합 (박혜미) — 개별 발주서(다중 파일 또는 zip) 업로드 →
//   template(기본양식.xlsx) 첨부 시 3단계: 수식·외부링크·서식·병합 보존한 "전체" 파일(raw XML 주입).
//   template 없으면 2단계: 물류센터별 17시트. format=json → 요약. 정산·배송비와 코드 공유 없음, 로그인만(2·3호 재사용).

// zip 내 .xlsx 엔트리를 버퍼로 추출 (fflate unzipSync, zero-dep·동기).
function unzipXlsx(buf: Buffer): { name: string; buffer: Buffer }[] {
  const entries = unzipSync(new Uint8Array(buf));
  const out: { name: string; buffer: Buffer }[] = [];
  for (const [path, data] of Object.entries(entries)) {
    if (/\.xlsx$/i.test(path) && !path.endsWith("/") && !path.startsWith("__MACOSX")) {
      out.push({ name: path.split("/").pop() || path, buffer: Buffer.from(data) });
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") ?? "xlsx";
  const inputs: { name: string; buffer: Buffer }[] = [];
  let templateBuf: Uint8Array | null = null;
  try {
    const form = await req.formData();
    const files = [...form.getAll("files"), ...form.getAll("file")]; // 다중 파일 + 단수 호환
    for (const f of files) {
      if (typeof f === "string") continue;
      const name = (f as File).name;
      const buf = Buffer.from(await (f as File).arrayBuffer());
      if (/\.zip$/i.test(name)) inputs.push(...unzipXlsx(buf));
      else if (/\.xlsx$/i.test(name)) inputs.push({ name, buffer: buf });
    }
    const tf = form.get("template"); // 3단계 수식본용 기본양식(선택)
    if (tf && typeof tf !== "string" && /\.xlsx$/i.test((tf as File).name)) templateBuf = new Uint8Array(await (tf as File).arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: "업로드 처리 실패: " + (e as Error).message }, { status: 400 });
  }
  if (inputs.length === 0) return NextResponse.json({ error: "발주서 파일(.xlsx) 또는 zip을 첨부해주세요." }, { status: 400 });

  const pos = inputs.map((i) => parseOrderBuffer(i.buffer, i.name));
  const sum = summarize(pos);

  if (format === "json") {
    return NextResponse.json({
      file_count: sum.fileCount, ok_count: sum.okCount, fail_count: sum.failCount,
      center_count: sum.centerCount, item_count: sum.itemCount, total_purchase: sum.totalPurAmt,
      arrivals: sum.arrivals, centers: sum.centers, failed: sum.failed,
    });
  }

  // 다운로드: template(기본양식) 첨부 시 3단계(수식·외부링크 보존 전체), 없으면 2단계(물류센터별 17시트)
  const dateStr = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  let outBuf: Buffer, filename: string, mode: string;
  let contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (templateBuf) {
    // 3단계 — 입고예정일별로 파일 분리(발주번호 1건=입고일 1개=센터 1개, 예외 0). 단일 날짜=xlsx, 복수=zip.
    const okPos = pos.filter((p) => p.ok);
    const byDate = new Map<string, ParsedPo[]>();
    for (const p of okPos) { const k = p.arrival || ""; const g = byDate.get(k) ?? []; g.push(p); byDate.set(k, g); }
    const poName = (arr: string) => `쿠팡 발주서리스트 전체(${arrivalParts(arr).yymmdd} 입고건)_전체.xlsx`;
    if (byDate.size <= 1) {
      const [arr, group] = [...byDate.entries()][0] ?? ["", okPos];
      outBuf = Buffer.from(buildTemplateBook(group, templateBuf));
      filename = poName(arr); mode = "template";
    } else {
      const entries: Record<string, Uint8Array> = {};
      for (const [arr, group] of byDate) entries[poName(arr)] = buildTemplateBook(group, templateBuf);
      outBuf = Buffer.from(zipSync(entries));
      filename = `쿠팡 발주서리스트_입고일별_${byDate.size}건_${dateStr}.zip`;
      contentType = "application/zip"; mode = "template-multi";
    }
  } else {
    const wb = XLSX.utils.book_new(); // 2단계 — 물류센터별 17시트
    for (const s of buildCenterSheets(pos)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa), s.sheetName);
    outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    filename = `쿠팡발주서_물류센터별_${dateStr}.xlsx`; mode = "centers";
  }
  return new NextResponse(new Uint8Array(outBuf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Mode": mode,
      "X-Center-Count": String(sum.centerCount),
      "X-Item-Count": String(sum.itemCount),
      "X-Fail-Count": String(sum.failCount),
    },
  });
}
