export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession, requireIntegrationStore } from "@/lib/auth";

// 교환 출고 발주서 (심유나 프로 CS·발주, 2026-07-24 확정) — IZ 전용.
//   사방넷 C/S메모관리 전체 다운로드 엑셀 업로드 → 답변내용 있는 행만 12컬럼 발주서로 변환.
//   ★ 답변내용 = 상품명(그대로, 파싱 절대 금지). 수량은 심유나 프로 수기 입력(빈칸 출력).
//   ※ 박혜미 정산(settlement)과 별개 라우트 — 입력 구조(2행 헤더)·출력 완전히 다름.

// 출력 12컬럼 헤더 (가공후 발주서 양식 실측). 4·6번은 헤더 빈칸(1·2차 F·H 수기입력용), 5번 "수량"은 값 빈칸(수기).
const OUT_HEADERS = [
  "수취인", "[우편번호] 주소", "수취인전화번호", "수취인핸드폰번호",
  // 8번 = "상품명"(1·2차 발주서와 통일). 값은 답변내용 문자열 그대로 (심유나 파일의 "상품명 = 답변내용"은 설명 표기라 미사용, 2026-07-24 Jae 확정)
  "", "수량", "", "상품명", "배송메세지", "쇼핑몰주문번호", "쇼핑몰명", "사방넷주문번호",
];

// 입력 컬럼 해석 — 헤더 문자열 탐색 우선, 없으면 1-based 스펙 인덱스(→0-based) fallback.
//   (박혜미 1행헤더와 별개: 이 파일은 1행 제목 / 2행 헤더 / 3행~ 데이터)
const IN_MAP: { out: number; names: string[]; idx: number }[] = [
  { out: 0,  names: ["수취인"],                          idx: 9 },
  { out: 1,  names: ["[우편번호] 주소", "우편번호] 주소"], idx: 12 },
  { out: 2,  names: ["수취인전화번호"],                   idx: 10 },
  { out: 3,  names: ["수취인핸드폰번호"],                 idx: 11 },
  // out 4·6 = 빈칸(수기), out 5 = 수량 헤더만·값 빈칸(수기) → 채우지 않음
  { out: 7,  names: ["답변내용"],                         idx: 29 },  // 상품명 = 답변내용 (문자열 그대로)
  { out: 8,  names: ["배송메세지", "배송메시지"],          idx: 25 },
  { out: 9,  names: ["쇼핑몰주문번호"],                   idx: 1 },
  { out: 10, names: ["쇼핑몰명"],                         idx: 3 },
  { out: 11, names: ["사방넷주문번호"],                   idx: 0 },
];
const ANS_NAMES = ["답변내용"], ANS_IDX = 29;

// 헤더 행 탐색 (제목 1행을 건너뛰기 위함) — 키워드 최다 행
function findHeaderRow(aoa: unknown[][]): number {
  const HINT = /수취인|답변내용|쇼핑몰주문번호|사방넷주문번호|배송메세지/;
  let hr = 0, best = -1;
  for (let i = 0; i < Math.min(5, aoa.length); i++) {
    const s = (aoa[i] || []).filter(c => HINT.test(String(c ?? ""))).length;
    if (s > best) { best = s; hr = i; }
  }
  return hr;
}
// 헤더명 완전일치 → 부분일치 → 인덱스 fallback
function colIndex(headers: string[], names: string[], fallback: number): number {
  for (const n of names) { const i = headers.findIndex(h => h === n); if (i >= 0) return i; }
  for (const n of names) { const i = headers.findIndex(h => h.includes(n)); if (i >= 0) return i; }
  return fallback;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!(await requireIntegrationStore(req))) {
    return NextResponse.json({ error: "이 기능은 해당 스토어에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "xlsx";
  let aoa: unknown[][];
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "엑셀 파일을 첨부해주세요." }, { status: 400 });
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" });
  } catch {
    return NextResponse.json({ error: "엑셀 파싱 실패 — CS메모관리 다운로드 파일인지 확인해주세요." }, { status: 400 });
  }

  const hr = findHeaderRow(aoa);
  const headers = (aoa[hr] || []).map(c => String(c ?? "").trim());
  const resolved = IN_MAP.map(m => ({ out: m.out, idx: colIndex(headers, m.names, m.idx) }));
  const ansCol = colIndex(headers, ANS_NAMES, ANS_IDX);

  // 데이터 행 → 답변내용 있는 행만 → 12컬럼
  const outRows: string[][] = [];
  let inputCount = 0;
  for (let r = hr + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    if (row.every(c => String(c ?? "").trim() === "")) continue; // 완전 빈 행 스킵
    inputCount++;
    const ans = String(row[ansCol] ?? "").trim();
    if (!ans) continue; // 필터: 답변내용 비어있지 않은 행만 (주문상태 미참조)
    const out = new Array(12).fill("");
    for (const { out: o, idx } of resolved) out[o] = String(row[idx] ?? "");
    outRows.push(out);
  }

  if (format === "json") {
    return NextResponse.json({
      input_rows: inputCount,
      order_rows: outRows.length,      // 답변내용 있는 = 발주 대상
      header_row: hr + 1,
      answer_col_index: ansCol,
    });
  }

  const outAoa = [OUT_HEADERS, ...outRows];
  const ws = XLSX.utils.aoa_to_sheet(outAoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "교환출고발주서");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const filename = `교환출고발주서_${date}.xlsx`;
  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Order-Count": String(outRows.length),
      "X-Input-Count": String(inputCount),
    },
  });
}
