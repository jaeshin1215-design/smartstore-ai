// 쿠팡 로켓배송(직매입) 발주서 취합 (박혜미) — Supplier Hub 개별 발주서 → 물류센터별 시트 + 전체 취합.
//   2026-08-12 신설. 정산·배송비 파이프라인과 코드 공유 없음(별개 기능). store 하드코딩 없음(파일에서 물류센터 읽음).
//   구조 근거: 개별 발주서 3섹션(거래처/발주정보/상품) + 상품당 2행(본행+BARCODE행). 라벨 앵커 파싱.
import * as XLSX from "xlsx";
import { unzipSync, strFromU8, strToU8, zipSync } from "fflate";

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
//   [2026-08-21] 정렬을 3단계와 통일 — 센터=코드포인트(가나다 아님·XRC 선두), 발주번호=숫자 오름차순.
//     (두 파일 순서가 다르면 고객 대조 시 혼란 — Jae 지시)
export function buildCenterSheets(pos: ParsedPo[]): { sheetName: string; aoa: unknown[][] }[] {
  const valid = pos.filter((p) => p.ok);
  const cp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0); // 코드포인트
  const centers = [...new Set(valid.map((p) => p.center))].sort(cp);
  const used = new Set<string>();
  return centers.map((center) => {
    const list = valid.filter((p) => p.center === center).sort((a, b) => (Number(a.poNo) - Number(b.poNo)) || cp(String(a.poNo), String(b.poNo)));
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

// ── 3단계 (템플릿 raw XML 주입) — 기본양식.xlsx에 데이터 섹션을 채워 수식·외부링크·서식·병합·Sheet1 보존 ──
//   ★ 새 워크북 생성 아님(SheetJS 왕복 시 externalLinks 소실 실증). 템플릿 XML을 직접 편집.
//   [2026-08-21 재작성] 스타일 인덱스 하드코딩 제거 → 템플릿의 헤더행(No./발주번호)과 그 아래 샘플 데이터쌍에서 학습.
//     (2026-08-13 경고 "양식 바꾸면 인덱스 재조정 필요"가 실제 발생 → 근본 대응: 템플릿-복제 방식)
//   구조: 요약(1~hSub 보존·M1 날짜만 교체) + 물류센터별 [헤더쌍 + 데이터쌍]. 센터 바뀔 때 [빈2행 + 헤더2행] 삽입.
//   정렬: 센터 코드포인트(가나다 아님 · XRC13(RC) 선두) → 발주번호 → No. B열=직전 데이터행과 값이 다를 때만 기입.
//     (⚠️ 상단 N2=SUM(COUNT(B:B))가 이 값을 세므로 중복 기입 시 발주 건수 부풀려짐 — 이번 수정의 핵심)
//   빈행·헤더는 값/수식 없이 스타일만. 바코드(D)는 전부 숫자면 int, R접두 등은 str.
//   ⚠️ 전제: 데이터시트=xl/worksheets/sheet1.xml, 헤더행 A="No."·B="발주번호", 그 아래 2행이 샘플 데이터쌍(본행+바코드).
const xesc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0); // 코드포인트 정렬(localeCompare 아님)
const mdParts = (a: string) => {
  const m = String(a).match(/(\d{4})[/.-](\d{2})[/.-](\d{2})/);
  return m
    ? { md: `${+m[2]}/${+m[3]}`, mmdd: m[2] + m[3], yymmdd: m[1].slice(2) + m[2] + m[3] }
    : { md: "", mmdd: "0000", yymmdd: "000000" };
};
export const arrivalParts = mdParts; // route 파일명(YYMMDD)·시트명(MMDD)용

const DATA_COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"];
const DATA_MERGE_COLS = ["A", "B", "C", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"]; // D·E·F 제외
const HDR_VMERGE_COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "M", "N", "O", "P", "Q", "R", "S"]; // 세로 2행(J:L은 가로 별도)

interface Skel { s: Record<string, string>; f: Record<string, string>; }
function getRowXml(sheet: string, r: number): string {
  const m = sheet.match(new RegExp(`<row r="${r}"[^>]*>[\\s\\S]*?</row>|<row r="${r}"[^>]*/>`));
  return m ? m[0] : "";
}
function parseSkel(rowXml: string): Skel {
  const s: Record<string, string> = {}, f: Record<string, string> = {};
  const re = /<c r="([A-S])\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowXml))) {
    const col = m[1], attr = m[2] || "", inner = m[3] || "";
    s[col] = (attr.match(/s="(\d+)"/) || [])[1] ?? "0";
    const fm = inner.match(/<f[^>]*>([\s\S]*?)<\/f>/); // t="shared" 등 속성 있는 <f> 포함(N열은 공유수식)
    if (fm) f[col] = fm[1];
  }
  return { s, f };
}

// 단일 입고예정일 pos → 한 워크북. 복수 날짜는 route에서 날짜별로 나눠 각각 호출.
export function buildTemplateBook(pos: ParsedPo[], templateBytes: Uint8Array): Uint8Array {
  const items = pos.filter((p) => p.ok).flatMap((p) => p.items)
    .sort((a, b) => cmpStr(a.center, b.center) || (Number(a.poNo) - Number(b.poNo)) || (a.no - b.no));
  const arrival = pos.find((p) => p.ok && p.arrival)?.arrival ?? "";
  const { md, mmdd } = mdParts(arrival);
  const z = unzipSync(templateBytes);
  const sheet = strFromU8(z["xl/worksheets/sheet1.xml"]);

  // 데이터 시작행 = E열에 수식(파레트 VLOOKUP)이 처음 나오는 행. 헤더 = 그 2행 위, 바코드 = 1행 아래.
  //   ★ 셀 텍스트(No./발주번호)에 의존하지 않음 — 실제 기본양식은 Excel산이라 공유문자열(t="s")이라 텍스트 매칭 불가.
  //   요약행(1~7)의 수식은 M·N열이라 E열 앵커에 안 걸림. openpyxl(인라인)·Excel(공유문자열) 템플릿 모두 동작.
  let mainR = 0;
  for (const m of sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    if (new RegExp(`<c r="E${m[1]}"[^>]*><f>`).test(m[2])) { mainR = +m[1]; break; }
  }
  if (!mainR || mainR < 3) throw new Error("템플릿에서 데이터 시작행(E열 수식)을 찾지 못했습니다.");
  const hTop = mainR - 2, hSub = mainR - 1, barR = mainR + 1;
  const hTopXml = getRowXml(sheet, hTop), hSubXml = getRowXml(sheet, hSub);
  const skM = parseSkel(getRowXml(sheet, mainR)); // 본행 스타일·수식
  const skB = parseSkel(getRowXml(sheet, barR));  // 바코드행 스타일
  const mainRefRe = new RegExp(`([A-Z]{1,2})${mainR}(?!\\d)`, "g");
  const fTpl = (col: string, r: number) => (skM.f[col] ?? "").replace(mainRefRe, `$1${r}`);

  // 셀 이미터(스타일은 학습값)
  const cV = (c: string, r: number, s: string, v: number | string) => `<c r="${c}${r}" s="${s}" t="n"><v>${v}</v></c>`;
  const cS = (c: string, r: number, s: string, t: string) => `<c r="${c}${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xesc(t)}</t></is></c>`;
  const cF = (c: string, r: number, s: string, f: string) => `<c r="${c}${r}" s="${s}"><f>${f}</f><v></v></c>`; // f는 이미 escape됨
  const cE = (c: string, r: number, s: string) => `<c r="${c}${r}" s="${s}" t="n"></c>`;
  const cCode = (c: string, r: number, s: string, v: string) => (/^\d+$/.test(String(v).trim()) ? cV(c, r, s, v) : cS(c, r, s, v));

  const emitMain = (r: number, it: PoItem, writeB: boolean) =>
    `<row r="${r}">`
    + cE("A", r, skM.s.A)
    + (writeB ? cCode("B", r, skM.s.B, String(it.poNo)) : cE("B", r, skM.s.B))
    + cCode("C", r, skM.s.C, String(it.code)) + cS("D", r, skM.s.D, it.name)
    + cF("E", r, skM.s.E, fTpl("E", r)) + cE("F", r, skM.s.F) + cS("G", r, skM.s.G, it.center)
    + cV("H", r, skM.s.H, it.orderQty) + cV("I", r, skM.s.I, it.supplyableQty)
    + cV("J", r, skM.s.J, it.purAmt) + cV("K", r, skM.s.K, it.supAmt) + cV("L", r, skM.s.L, it.vatAmt)
    + cF("M", r, skM.s.M, fTpl("M", r)) + cF("N", r, skM.s.N, fTpl("N", r)) + cF("O", r, skM.s.O, fTpl("O", r))
    + cF("P", r, skM.s.P, fTpl("P", r)) + cF("Q", r, skM.s.Q, fTpl("Q", r)) + cF("R", r, skM.s.R, fTpl("R", r)) + cF("S", r, skM.s.S, fTpl("S", r))
    + `</row>`;
  const emitBar = (r: number, barcode: string) =>
    `<row r="${r}">` + DATA_COLS.map((c) => (c === "D" ? cCode("D", r, skB.s.D, barcode) : cE(c, r, skB.s[c]))).join("") + `</row>`;
  const emitEmpty = (r: number, sk: Skel) =>
    `<row r="${r}">` + DATA_COLS.map((c) => cE(c, r, sk.s[c])).join("") + `</row>`;
  const cloneRow = (xml: string, oldR: number, newR: number) =>
    xml.replace(new RegExp(`^<row r="${oldR}"`), `<row r="${newR}"`)
      .replace(new RegExp(` r="([A-S])${oldR}"`, "g"), ` r="$1${newR}"`)
      .replace(new RegExp(`C${oldR}(?!\\d)`, "g"), `C${newR}`); // 헤더 M열 수식 C-참조
  const dataMerges = (r: number) => DATA_MERGE_COLS.map((c) => `<mergeCell ref="${c}${r}:${c}${r + 1}"/>`).join("");
  const hdrMerges = (r: number) => HDR_VMERGE_COLS.map((c) => `<mergeCell ref="${c}${r}:${c}${r + 1}"/>`).join("") + `<mergeCell ref="J${r}:L${r}"/>`;

  // 물류센터 순서(정렬된 items의 등장 순 = 코드포인트 순)
  const centers: string[] = [];
  for (const it of items) if (!centers.length || centers[centers.length - 1] !== it.center) centers.push(it.center);

  let dr = mainR, dataXml = "", genMerges = "", prevPO: string | null = null;
  centers.forEach((center, ci) => {
    if (ci > 0) {
      dataXml += emitEmpty(dr, skM) + emitEmpty(dr + 1, skB); genMerges += dataMerges(dr); dr += 2;           // 빈 2행
      dataXml += cloneRow(hTopXml, hTop, dr) + cloneRow(hSubXml, hSub, dr + 1); genMerges += hdrMerges(dr); dr += 2; // 헤더 2행 복제
    }
    for (const it of items.filter((x) => x.center === center)) {
      const writeB = String(it.poNo) !== prevPO; prevPO = String(it.poNo);
      dataXml += emitMain(dr, it, writeB) + emitBar(dr + 1, it.barcode); genMerges += dataMerges(dr); dr += 2;
    }
  });
  const lastRow = dr - 1;

  // 요약행(1~hSub) 보존 + M1 날짜만 교체
  let kept = "";
  for (let rn = 1; rn <= hSub; rn++) {
    let rx = getRowXml(sheet, rn);
    // M1 날짜 교체 — 셀 종류(공유문자열 t="s" / 인라인 / 수식) 무관하게 스타일만 보존하고 inlineStr로 재작성.
    if (rn === 1) rx = rx.replace(/<c r="M1"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/, (_full, attr: string) => {
      const s = (attr.match(/s="(\d+)"/) || [])[1];
      return `<c r="M1"${s ? ` s="${s}"` : ""} t="inlineStr"><is><t xml:space="preserve">${xesc(md)}일 쿠팡 납품 (부가세별도)</t></is></c>`;
    });
    kept += rx;
  }
  // 요약 병합(양끝 ≤ hSub) 보존 + 생성 병합
  let preserved = "";
  for (const m of sheet.matchAll(/<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g)) if (+m[2] <= hSub && +m[4] <= hSub) preserved += m[0];
  const total = (preserved.match(/<mergeCell/g) || []).length + (genMerges.match(/<mergeCell/g) || []).length;

  const head = sheet.slice(0, sheet.indexOf("<sheetData>")).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:S${lastRow}"/>`);
  const tail = sheet.slice(sheet.indexOf("</mergeCells>") + "</mergeCells>".length);
  z["xl/worksheets/sheet1.xml"] = strToU8(head + "<sheetData>" + kept + dataXml + "</sheetData>"
    + `<mergeCells count="${total}">` + preserved + genMerges + "</mergeCells>" + tail);

  // 첫 시트명 → MMDD + fullCalcOnLoad + calcChain 제거(캐시 파괴 없이 Excel이 열 때 재계산)
  let wbxml = strFromU8(z["xl/workbook.xml"]).replace(/(<sheet name=")[^"]*("[^>]*\/>)/, `$1${mmdd}$2`);
  if (!/<calcPr[^>]*fullCalcOnLoad/.test(wbxml)) wbxml = wbxml.replace(/<calcPr([^/>]*)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>');
  z["xl/workbook.xml"] = strToU8(wbxml);
  delete z["xl/calcChain.xml"];
  z["[Content_Types].xml"] = strToU8(strFromU8(z["[Content_Types].xml"]).replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, ""));
  if (z["xl/_rels/workbook.xml.rels"]) z["xl/_rels/workbook.xml.rels"] = strToU8(strFromU8(z["xl/_rels/workbook.xml.rels"]).replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/, ""));
  return zipSync(z);
}
