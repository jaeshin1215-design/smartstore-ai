export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { parseOrderBuffer, buildCenterSheets, buildAllSheet, summarize } from "@/lib/coupang-po";

// 쿠팡 로켓배송 발주서 취합 (박혜미) — 개별 발주서(다중 파일 또는 zip) 업로드 →
//   2단계: 물류센터별 시트 + 3단계: 전체 취합 시트 = 한 워크북 다운로드. format=json → 요약.
//   정산·배송비 파이프라인과 코드 공유 없음. store 하드코딩 없음(로그인만 요구, 2·3호 재사용).

// yauzl(기존 transitive dep) 런타임 require — zip 내 .xlsx 엔트리를 버퍼로 추출.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yauzl = require("yauzl");

function unzipXlsx(buf: Buffer): Promise<{ name: string; buffer: Buffer }[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err: Error | null, zip: { on: (e: string, cb: (...a: unknown[]) => void) => void; openReadStream: (entry: unknown, cb: (e: Error | null, rs: NodeJS.ReadableStream) => void) => void; readEntry: () => void }) => {
      if (err || !zip) return reject(err ?? new Error("zip 열기 실패"));
      const out: { name: string; buffer: Buffer }[] = [];
      zip.on("entry", (entry: unknown) => {
        const name = String((entry as { fileName: string }).fileName);
        if (/\.xlsx$/i.test(name) && !name.endsWith("/") && !name.startsWith("__MACOSX")) {
          zip.openReadStream(entry, (e: Error | null, rs: NodeJS.ReadableStream) => {
            if (e) return reject(e);
            const chunks: Buffer[] = [];
            rs.on("data", (c: Buffer) => chunks.push(c));
            rs.on("end", () => { out.push({ name: name.split("/").pop() || name, buffer: Buffer.concat(chunks) }); zip.readEntry(); });
            rs.on("error", reject);
          });
        } else zip.readEntry();
      });
      zip.on("end", () => resolve(out));
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") ?? "xlsx";
  const inputs: { name: string; buffer: Buffer }[] = [];
  try {
    const form = await req.formData();
    const files = [...form.getAll("files"), ...form.getAll("file")]; // 다중 파일 + 단수 호환
    for (const f of files) {
      if (typeof f === "string") continue;
      const name = (f as File).name;
      const buf = Buffer.from(await (f as File).arrayBuffer());
      if (/\.zip$/i.test(name)) inputs.push(...(await unzipXlsx(buf)));
      else if (/\.xlsx$/i.test(name)) inputs.push({ name, buffer: buf });
    }
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

  // 한 워크북 = 전체(3단계) 시트 + 물류센터별(2단계) 시트들
  const wb = XLSX.utils.book_new();
  const all = buildAllSheet(pos);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(all.aoa), all.sheetName);
  for (const s of buildCenterSheets(pos)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa), s.sheetName);
  const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `쿠팡발주서_취합_${new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(outBuf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Center-Count": String(sum.centerCount),
      "X-Item-Count": String(sum.itemCount),
      "X-Fail-Count": String(sum.failCount),
    },
  });
}
