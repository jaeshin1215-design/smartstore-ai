"use client";

// Inbox > 발주 처리 — 심유나 프로 수작업 대체 수도꼭지 2개 (2026-07-09)
// 수도꼭지 1: 미발주 주문 → CJ 송장 엑셀 (14열 A~N)
// 수도꼭지 2: 오포물류/오포_카노위탁 교차 송장 매칭 → 사방넷 업로드용 3컬럼 파일
// 디자인: 텍스트 흑/회색·흰 배경·카드 1px 보더 + 0 2px 8px rgba(0,0,0,0.04)·버튼만 핑크

import { useState } from "react";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #e8eaed", borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "24px", marginBottom: 20,
};

interface MatchSummary {
  date: string;
  order_count: number;
  total_groups: number;
  multi_groups: number;
  fillable_groups: number;
  filled_rows: number;
  preview: { sbOrdNo: string; waybillNo: string; receiverNm: string; productAbbr: string; logisticsNm: string; matched?: boolean }[];
}

interface CjSummary {
  date: string;
  order_count: number;
  consignment_count: number; // 위탁업체(오포물류·오포_카노위탁) 건수
  // 전화·주소는 마스킹된 값 (화면 표시용) / 이름·상품명은 원본
  preview: { receiver: string; product: string; shop: string; phone: string; addr: string; logistics: string; consignment: boolean }[];
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}
// 오늘 기준 n일 전 (n=0 → 오늘). yyyy-MM-dd
function kstDaysAgo(n: number): string {
  return new Date(Date.now() + 9 * 3600000 - n * 86400000).toISOString().slice(0, 10);
}

export default function OrderProcessingSection() {
  // 기간 범위 (2026-07-15 심유나 프로 요청) — 기본값 오늘 하루(기존 흐름 유지)
  const [startDate, setStartDate] = useState(kstToday()); // yyyy-MM-dd
  const [endDate, setEndDate] = useState(kstToday());
  const [cjLoading, setCjLoading] = useState(false);
  const [cjMsg, setCjMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cjSummary, setCjSummary] = useState<CjSummary | null>(null);
  const [cjPreviewLoading, setCjPreviewLoading] = useState(false);
  const [excludeConsignment, setExcludeConsignment] = useState(false); // 위탁업체 제외 보기 (기본 OFF)
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMsg, setMatchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [downloadingMatch, setDownloadingMatch] = useState(false);

  const cStart = startDate.replace(/-/g, "");
  const cEnd = endDate.replace(/-/g, "");
  const isRange = startDate !== endDate;
  // CJ 송장(수도꼭지1)은 기간, 세트분리 매칭(수도꼭지2)은 종료일 하루 기준(현행 유지)
  const cjRangeQS = `startDate=${cStart}&endDate=${cEnd}`;
  const storeId = typeof window !== "undefined" ? localStorage.getItem("sellfit_store_id") ?? "" : "";

  // 프리셋: 오늘 / 최근3일 / 최근7일 (종료일 항상 오늘)
  function applyPreset(days: number) {
    setStartDate(kstDaysAgo(days));
    setEndDate(kstToday());
  }
  const activePreset = endDate === kstToday()
    ? (startDate === kstToday() ? 0 : startDate === kstDaysAgo(2) ? 2 : startDate === kstDaysAgo(6) ? 6 : -1)
    : -1;

  async function downloadFile(url: string): Promise<{ ok: boolean; rows?: string; error?: string; empty?: boolean }> {
    const res = await fetch(url);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error ?? `HTTP ${res.status}`, empty: j?.empty === true };
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const m = cd.match(/filename\*=UTF-8''([^;]+)/);
    const filename = m ? decodeURIComponent(m[1]) : "download.xlsx";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return { ok: true, rows: res.headers.get("X-Row-Count") ?? "?" };
  }

  async function handleCjPreview() {
    setCjPreviewLoading(true);
    setCjMsg(null);
    setCjSummary(null);
    try {
      const res = await fetch(`/api/sabangnet/cj-excel?${cjRangeQS}&format=json`);
      const j = await res.json();
      if (!res.ok) setCjMsg({ ok: j.empty === true, text: j.error ?? `HTTP ${res.status}` }); // 0건은 안내
      else setCjSummary(j);
    } catch { setCjMsg({ ok: false, text: "네트워크 오류" }); }
    setCjPreviewLoading(false);
  }

  async function handleCjExcel() {
    setCjLoading(true);
    setCjMsg(null);
    const excl = excludeConsignment ? "&excludeConsignment=1" : "";
    const r = await downloadFile(`/api/sabangnet/cj-excel?${cjRangeQS}&store_id=${storeId}${excl}`);
    const label = isRange ? `${cStart}-${cEnd}` : cStart;
    setCjMsg(r.ok
      ? { ok: true, text: `다운로드 완료 — ${r.rows}건 (${label}_주문서확인처리_@cj택배.xlsx)` }
      : { ok: r.empty === true, text: r.error ?? "실패" }); // 신규주문 0건은 안내(초록), 실오류만 빨강
    setCjLoading(false);
  }

  async function handleMatchSummary() {
    setMatchLoading(true);
    setMatchMsg(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/sabangnet/waybill-match?date=${cEnd}&format=json`);
      const j = await res.json();
      if (!res.ok) { setMatchMsg({ ok: false, text: j.error ?? `HTTP ${res.status}` }); }
      else setSummary(j);
    } catch { setMatchMsg({ ok: false, text: "네트워크 오류" }); }
    setMatchLoading(false);
  }

  async function handleMatchDownload() {
    setDownloadingMatch(true);
    const r = await downloadFile(`/api/sabangnet/waybill-match?date=${cEnd}&format=xls&store_id=${storeId}`);
    setMatchMsg(r.ok
      ? { ok: true, text: `다운로드 완료 — ${r.rows}건 (${cEnd}_사방넷_송장_업로드용.xls)` }
      : { ok: false, text: r.error ?? "실패" });
    setDownloadingMatch(false);
  }

  const Msg = ({ msg }: { msg: { ok: boolean; text: string } }) => (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13,
      background: msg.ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${msg.ok ? "#86efac" : "#fecaca"}`,
      color: msg.ok ? "#15803d" : "#dc2626",
    }}>
      {msg.ok ? "✓ " : "⚠ "}{msg.text}
    </div>
  );

  return (
    <div style={{ fontFamily: FF }}>
      {/* 대상 기간 (주문일 기준) */}
      <div style={{ ...CARD, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>대상 기간 (주문일)</span>
        {/* 프리셋 버튼 */}
        <div style={{ display: "flex", gap: 6 }}>
          {[{ label: "오늘", n: 0 }, { label: "최근 3일", n: 2 }, { label: "최근 7일", n: 6 }].map((p) => {
            const active = activePreset === p.n;
            return (
              <button key={p.n} onClick={() => applyPreset(p.n)}
                style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FF,
                  border: `1px solid ${active ? "#ef567c" : "#e8eaed"}`,
                  background: active ? "#fdecf1" : "#fff",
                  color: active ? "#ef567c" : "#6b7280",
                }}>
                {p.label}
              </button>
            );
          })}
        </div>
        {/* 사용자 지정 범위 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #e8eaed", borderRadius: 8, fontSize: 13, fontFamily: FF, color: "#374151", outline: "none" }}
          />
          <span style={{ fontSize: 13, color: "#9ca3af" }}>~</span>
          <input
            type="date" value={endDate} min={startDate} max={kstToday()} onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #e8eaed", borderRadius: 8, fontSize: 13, fontFamily: FF, color: "#374151", outline: "none" }}
          />
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          {isRange ? `${cStart}~${cEnd} 기간 조회` : "기본값 오늘 — 사방넷 주문일 기준"}
        </span>
      </div>

      {/* 수도꼭지 1 — CJ 송장 엑셀 */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>CJ 송장 엑셀 생성</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
          사방넷 주문을 CJ 송장프로그램 업로드 양식(14열 A~N: 물류처명·수취인·주소·…·우편번호)으로 변환합니다.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCjPreview} disabled={cjPreviewLoading}
            style={{
              padding: "11px 24px", borderRadius: 8, border: "1px solid #e8eaed",
              background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700,
              cursor: cjPreviewLoading ? "default" : "pointer", fontFamily: FF,
            }}>
            {cjPreviewLoading ? "불러오는 중..." : "미리보기"}
          </button>
          <button onClick={handleCjExcel} disabled={cjLoading}
            style={{
              padding: "11px 24px", borderRadius: 8, border: "none",
              background: cjLoading ? "#c4c8cc" : "#ef567c", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: cjLoading ? "default" : "pointer", fontFamily: FF,
            }}>
            {cjLoading ? "생성 중..." : `${isRange ? "기간" : "오늘"} 주문 → CJ 송장 엑셀 ↓`}
          </button>
        </div>

        {cjSummary && (
          <div style={{ marginTop: 16, border: "1px solid #e8eaed", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#111827", fontWeight: 700 }}>
                {isRange ? "기간" : "오늘"} 주문 {cjSummary.order_count}건
                {cjSummary.consignment_count > 0 && (
                  <span style={{ fontWeight: 400, color: "#c2410c", marginLeft: 8 }}>· 위탁 {cjSummary.consignment_count}건 포함</span>
                )}
                <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
                  (상위 {cjSummary.preview.length}건 미리보기 · 전화·주소는 마스킹, 다운로드 파일은 원본)
                </span>
              </span>
              {/* 위탁업체 제외 보기 토글 — 위탁 건 있을 때만 노출 (기본 OFF) */}
              {cjSummary.consignment_count > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#374151", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={excludeConsignment} onChange={(e) => setExcludeConsignment(e.target.checked)}
                    style={{ accentColor: "#ef567c", width: 15, height: 15, cursor: "pointer" }} />
                  위탁업체 제외 보기
                </label>
              )}
            </div>
            {excludeConsignment && cjSummary.consignment_count > 0 && (
              <div style={{ padding: "8px 16px", background: "#fff7ed", borderBottom: "1px solid #fed7aa", fontSize: 11, color: "#c2410c", lineHeight: 1.6 }}>
                위탁업체 건 숨김 중 — 다운로드 시에도 위탁 물류처(오포물류·오포_카노위탁) 건이 제외됩니다. (2차 발주 자사 제품만)
              </div>
            )}
            {cjSummary.preview.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderTop: "1px solid #e8eaed", borderBottom: "1px solid #e8eaed" }}>
                    {["물류처", "수취인", "상품명", "매출처명", "전화", "주소"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cjSummary.preview
                    .filter((r) => !(excludeConsignment && r.consignment))
                    .map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {r.logistics}
                        {r.consignment && (
                          <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>위탁</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 16px", color: "#111827" }}>{r.receiver}</td>
                      <td style={{ padding: "8px 16px", color: "#374151", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product}</td>
                      <td style={{ padding: "8px 16px", color: "#6b7280" }}>{r.shop}</td>
                      <td style={{ padding: "8px 16px", color: "#9ca3af" }}>{r.phone}</td>
                      <td style={{ padding: "8px 16px", color: "#9ca3af", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.addr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {cjMsg && <Msg msg={cjMsg} />}
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>
          수량=실출고수량(CM_EA)·상품명=상품약어+옵션 — 심유나 프로 확인 완료
        </div>
      </div>

      {/* 수도꼭지 2 — 세트분리 송장 매칭 */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>세트분리 송장 매칭</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
          수취인+쇼핑몰주문번호가 같은 그룹에서 송장번호 있는 행의 값을 없는 행에 채웁니다.
          결과는 사방넷 업로드용 3컬럼(사방넷주문번호·운송장번호·물류처명) 파일로 내려받습니다.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleMatchSummary} disabled={matchLoading}
            style={{
              padding: "11px 24px", borderRadius: 8, border: "1px solid #e8eaed",
              background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700,
              cursor: matchLoading ? "default" : "pointer", fontFamily: FF,
            }}>
            {matchLoading ? "매칭 중..." : "매칭 결과 미리보기"}
          </button>
          <button onClick={handleMatchDownload} disabled={downloadingMatch || (summary != null && summary.filled_rows === 0)}
            style={{
              padding: "11px 24px", borderRadius: 8, border: "none",
              background: downloadingMatch || (summary != null && summary.filled_rows === 0) ? "#c4c8cc" : "#ef567c",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: downloadingMatch ? "default" : "pointer", fontFamily: FF,
            }}>
            {downloadingMatch ? "생성 중..." : "송장 매칭 파일 ↓"}
          </button>
        </div>

        {summary && (
          <div style={{ marginTop: 16, border: "1px solid #e8eaed", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f9fafb", fontSize: 13, color: "#111827", fontWeight: 700 }}>
              {summary.fillable_groups}그룹, {summary.filled_rows}건에 송장번호 채움
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
                (주문 {summary.order_count}건 · 전체 {summary.total_groups}그룹 · 다건 그룹 {summary.multi_groups})
              </span>
            </div>
            {summary.filled_rows > 0 && (
              <>
                <div style={{ padding: "8px 16px", background: "#fff7ed", borderBottom: "1px solid #fed7aa", fontSize: 11, color: "#c2410c", lineHeight: 1.6 }}>
                  🟠 색표시 = 오포물류·오포_카노위탁 교차 합배송 <b>추정</b> 자동매칭 — 100% 단정 아님, 업로드 전 눈으로 최종 확인하세요.
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderTop: "1px solid #e8eaed", borderBottom: "1px solid #e8eaed" }}>
                      {["사방넷주문번호", "채워질 운송장번호", "수취인", "물류처", "상품약어"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.preview.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: p.matched ? "#fff7ed" : "#fff" }}>
                        <td style={{ padding: "8px 16px", color: "#374151" }}>{p.sbOrdNo}</td>
                        <td style={{ padding: "8px 16px", color: "#374151" }}>{p.waybillNo}</td>
                        <td style={{ padding: "8px 16px", color: "#374151" }}>{p.receiverNm}</td>
                        <td style={{ padding: "8px 16px", color: "#6b7280" }}>{p.logisticsNm}</td>
                        <td style={{ padding: "8px 16px", color: "#6b7280" }}>{p.productAbbr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
        {matchMsg && <Msg msg={matchMsg} />}
      </div>
    </div>
  );
}
