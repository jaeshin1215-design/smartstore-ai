// 쿠팡 로켓배송(직매입) 발주서 취합 (박혜미) — Supplier Hub 개별 발주서 → 물류센터별 시트 + 전체 취합.
//   2026-08-12 신설. 정산·배송비 파이프라인과 코드 공유 없음(별개 기능). store 하드코딩 없음(파일에서 물류센터 읽음).
//   구조 근거: 개별 발주서 3섹션(거래처/발주정보/상품) + 상품당 2행(본행+BARCODE행). 라벨 앵커 파싱.
import * as XLSX from "xlsx";

export interface PoItem {
  no: number; code: string; name: string; barcode: string;
  buyType: string;   // 매입유형 (직매입)
  taxType: string;   // 면세여부 (과세)
  orderType: string; // 발주유형 (일반)
  center: string;    // 물류센터
  orderQty: number; supplyableQty: number; receivedQty: number;
  purAmt: number; supAmt: number; vatAmt: number; // 금액(매입가·공급가액·부가세)
  poNo: string; manager: string; arrival: string;
}
export interface ParsedPo {
  file: string; poNo: string; manager: string; center: string; arrival: string; vendorName: string;
  items: PoItem[]; ok: boolean; reason?: string;
}

// 개별 발주서 워크북(버퍼) → 파싱. 첫 시트 사용.
export function parseOrderBuffer(buf: ArrayBuffer | Uint8Array, file: string): ParsedPo {
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    return parseOrderSheet(wb.Sheets[wb.SheetNames[0]], file);
  } catch (e) {
    return { file, poNo: "", manager: "", center: "", arrival: "", vendorName: "", items: [], ok: false, reason: "파싱 실패: " + (e as Error).message };
  }
}

function parseOrderSheet(ws: XLSX.WorkSheet, file: string): ParsedPo {
  const g = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
  const S = (r: number, c: number) => (g[r] ? String((g[r] as unknown[])[c] ?? "").trim() : "");
  const N = (r: number, c: number) => { const n = Number(S(r, c).replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
  const findA = (label: string) => g.findIndex((row) => String((row as unknown[])?.[0] ?? "").trim() === label);

  const rVendor = findA("거래처명");
  const vendorName = rVendor >= 0 ? S(rVendor, 2) : "";
  const rPo = findA("발주번호");
  const poNo = rPo >= 0 ? S(rPo, 2) : "";
  const manager = rPo >= 0 ? S(rPo, 7) : "";
  // 발주정보 물류센터/입고예정일: C열="물류센터" & F열 "입고예정" 헤더행 → 다음 행이 값
  const rWh = g.findIndex((row) => String((row as unknown[])?.[2] ?? "").trim() === "물류센터" && String((row as unknown[])?.[5] ?? "").includes("입고예정"));
  const center = rWh >= 0 ? S(rWh + 1, 2) : "";
  const arrival = rWh >= 0 ? S(rWh + 1, 5) : "";
  // 상품표 헤더행 A="No." & B="상품코드" → 2행 병합헤더, 데이터 rHdr+2부터. 상품당 2행(본행+BARCODE행).
  const rHdr = g.findIndex((row) => String((row as unknown[])?.[0] ?? "").trim() === "No." && String((row as unknown[])?.[1] ?? "").trim() === "상품코드");
  const items: PoItem[] = [];
  if (rHdr >= 0) {
    for (let r = rHdr + 2; r < g.length; r++) {
      const no = S(r, 0);
      if (no === "합계") break;
      if (!/^\d+$/.test(no)) continue; // 본행(A=번호)만; BARCODE행·빈행은 본행 처리에서 흡수
      items.push({
        no: Number(no), code: S(r, 1), name: S(r, 2), barcode: S(r + 1, 2),
        buyType: S(r, 3), taxType: S(r + 1, 3), orderType: S(r, 4), center: S(r, 5),
        orderQty: N(r, 6), supplyableQty: N(r, 7), receivedQty: N(r, 8),
        purAmt: N(r, 12), supAmt: N(r, 13), vatAmt: N(r, 14),
        poNo, manager, arrival,
      });
    }
  }
  const ok = !!poNo && !!center && items.length > 0;
  return { file, poNo, manager, center, arrival, vendorName, items, ok, reason: ok ? undefined : "발주번호/물류센터/상품 인식 실패 — 쿠팡 발주서 양식인지 확인" };
}

// 엑셀 시트명 규칙(31자·금지문자 제거)
function safeSheetName(name: string, used: Set<string>): string {
  let s = String(name).replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "sheet";
  let base = s, i = 2;
  while (used.has(s)) { s = (base.slice(0, 28) + "_" + i).slice(0, 31); i++; }
  used.add(s); return s;
}

const BLOCK_HDR = ["No.", "상품코드", "상품명/옵션/BARCODE", "매입유형/면세여부", "발주유형", "물류센터", "발주수량", "업체납품가능수량", "발주금액"];
const BLOCK_SUB = ["", "", "", "", "", "", "", "", "매입가", "공급가액", "부가세"];

// 한 발주번호 블록(발주번호 헤더 + 2행 컬럼헤더 + 상품 2행씩 + 빈행) → AOA 조각
function poBlock(po: ParsedPo): unknown[][] {
  const rows: unknown[][] = [];
  rows.push(["발주번호", "", po.poNo, "", "발주담당자", "", "", po.manager]);
  rows.push([...BLOCK_HDR]);
  rows.push([...BLOCK_SUB]);
  for (const it of po.items) {
    rows.push([it.no, it.code, it.name, it.buyType, it.orderType, it.center, it.orderQty, it.supplyableQty, it.purAmt, it.supAmt, it.vatAmt]);
    rows.push(["", "", it.barcode, it.taxType]);
  }
  rows.push([]);
  return rows;
}

// 2단계: 물류센터별 시트(발주번호 블록 누적). 정답지 ★발주리스트★ 양식 재현.
export function buildCenterSheets(pos: ParsedPo[]): { sheetName: string; aoa: unknown[][] }[] {
  const valid = pos.filter((p) => p.ok);
  const centers = [...new Set(valid.map((p) => p.center))].sort((a, b) => a.localeCompare(b, "ko"));
  const used = new Set<string>();
  return centers.map((center) => {
    const list = valid.filter((p) => p.center === center).sort((a, b) => a.poNo.localeCompare(b.poNo));
    const aoa: unknown[][] = [];
    for (const po of list) aoa.push(...poBlock(po));
    return { sheetName: safeSheetName(center, used), aoa };
  });
}

// 3단계: 전체 취합(단일 시트·평면 리스트 + 합계). 정답지 없음 → 합리적 기본값(판단 목록은 보고서 참조).
const ALL_HDR = ["No.", "물류센터", "발주번호", "상품코드", "상품명", "바코드", "매입유형", "면세여부", "발주유형", "발주수량", "업체납품가능수량", "매입가", "공급가액", "부가세"];
export function buildAllSheet(pos: ParsedPo[]): { sheetName: string; aoa: unknown[][] } {
  const valid = pos.filter((p) => p.ok);
  const items = valid.flatMap((p) => p.items);
  // 정렬: 물류센터 → 발주번호 → No (원본 그룹핑 유지)
  items.sort((a, b) => a.center.localeCompare(b.center, "ko") || a.poNo.localeCompare(b.poNo) || a.no - b.no);
  const dates = [...new Set(valid.map((p) => p.arrival).filter(Boolean))];
  const sheetName = dates.length === 1 ? mmdd(dates[0]) : "전체"; // 입고예정일 단일 → MMDD, 혼합 → "전체"
  const aoa: unknown[][] = [ALL_HDR];
  let sumQty = 0, sumPur = 0, sumSup = 0, sumVat = 0;
  items.forEach((it, i) => {
    aoa.push([i + 1, it.center, it.poNo, it.code, it.name, it.barcode, it.buyType, it.taxType, it.orderType, it.orderQty, it.supplyableQty, it.purAmt, it.supAmt, it.vatAmt]);
    sumQty += it.orderQty; sumPur += it.purAmt; sumSup += it.supAmt; sumVat += it.vatAmt;
  });
  aoa.push(["합계", "", "", "", "", "", "", "", "", sumQty, "", sumPur, sumSup, sumVat]);
  return { sheetName, aoa };
}
function mmdd(s: string): string { const m = String(s).match(/(\d{4})[/.-](\d{2})[/.-](\d{2})/); return m ? m[2] + m[3] : String(s).slice(0, 8) || "전체"; }

export interface PoSummary { fileCount: number; okCount: number; failCount: number; centerCount: number; itemCount: number; totalPurAmt: number; arrivals: string[]; failed: { file: string; reason: string }[]; centers: { center: string; poCount: number; itemCount: number }[]; }
export function summarize(pos: ParsedPo[]): PoSummary {
  const valid = pos.filter((p) => p.ok);
  const byC: Record<string, { po: Set<string>; items: number }> = {};
  for (const p of valid) { const b = byC[p.center] ??= { po: new Set(), items: 0 }; b.po.add(p.poNo); b.items += p.items.length; }
  return {
    fileCount: pos.length, okCount: valid.length, failCount: pos.length - valid.length,
    centerCount: Object.keys(byC).length, itemCount: valid.reduce((s, p) => s + p.items.length, 0),
    totalPurAmt: valid.reduce((s, p) => s + p.items.reduce((t, it) => t + it.purAmt, 0), 0),
    arrivals: [...new Set(valid.map((p) => p.arrival).filter(Boolean))],
    failed: pos.filter((p) => !p.ok).map((p) => ({ file: p.file, reason: p.reason ?? "" })),
    centers: Object.entries(byC).map(([center, b]) => ({ center, poCount: b.po.size, itemCount: b.items })).sort((a, b) => a.center.localeCompare(b.center, "ko")),
  };
}
