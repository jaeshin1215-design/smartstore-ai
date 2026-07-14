"use client";

// Inbox > 발주 처리 — 심유나 프로 수작업 대체 수도꼭지 2개 (2026-07-09)
// 수도꼭지 1: 오늘 주문 → CJ 송장 엑셀 (11컬럼)
// 수도꼭지 2: 세트분리 송장 매칭 → 사방넷 업로드용 3컬럼 파일
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
  preview: { sbOrdNo: string; waybillNo: string; receiverNm: string; productAbbr: string }[];
}

interface CjSummary {
  date: string;
  order_count: number;
  // 전화·주소는 마스킹된 값 (화면 표시용) / 이름·상품명은 원본
  preview: { receiver: string; product: string; shop: string; phone: string; addr: string }[];
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

export default function OrderProcessingSection() {
  const [date, setDate] = useState(kstToday()); // yyyy-MM-dd (input용)
  const [cjLoading, setCjLoading] = useState(false);
  const [cjMsg, setCjMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cjSummary, setCjSummary] = useState<CjSummary | null>(null);
  const [cjPreviewLoading, setCjPreviewLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMsg, setMatchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [downloadingMatch, setDownloadingMatch] = useState(false);

  const compact = date.replace(/-/g, "");
  const storeId = typeof window !== "undefined" ? localStorage.getItem("sellfit_store_id") ?? "" : "";

  async function downloadFile(url: string): Promise<{ ok: boolean; rows?: string; error?: string }> {
    const res = await fetch(url);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error ?? `HTTP ${res.status}` };
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
      const res = await fetch(`/api/sabangnet/cj-excel?date=${compact}&format=json`);
      const j = await res.json();
      if (!res.ok) setCjMsg({ ok: false, text: j.error ?? `HTTP ${res.status}` });
      else setCjSummary(j);
    } catch { setCjMsg({ ok: false, text: "네트워크 오류" }); }
    setCjPreviewLoading(false);
  }

  async function handleCjExcel() {
    setCjLoading(true);
    setCjMsg(null);
    const r = await downloadFile(`/api/sabangnet/cj-excel?date=${compact}&store_id=${storeId}`);
    setCjMsg(r.ok
      ? { ok: true, text: `다운로드 완료 — ${r.rows}건 (${compact}_주문서확인처리_@cj택배.xlsx)` }
      : { ok: false, text: r.error ?? "실패" });
    setCjLoading(false);
  }

  async function handleMatchSummary() {
    setMatchLoading(true);
    setMatchMsg(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/sabangnet/waybill-match?date=${compact}&format=json`);
      const j = await res.json();
      if (!res.ok) { setMatchMsg({ ok: false, text: j.error ?? `HTTP ${res.status}` }); }
      else setSummary(j);
    } catch { setMatchMsg({ ok: false, text: "네트워크 오류" }); }
    setMatchLoading(false);
  }

  async function handleMatchDownload() {
    setDownloadingMatch(true);
    const r = await downloadFile(`/api/sabangnet/waybill-match?date=${compact}&format=xls&store_id=${storeId}`);
    setMatchMsg(r.ok
      ? { ok: true, text: `다운로드 완료 — ${r.rows}건 (${compact}_사방넷_송장_업로드용.xls)` }
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
      {/* 대상 날짜 */}
      <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>대상 날짜 (주문일)</span>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #e8eaed", borderRadius: 8, fontSize: 13, fontFamily: FF, color: "#374151", outline: "none" }}
        />
        <span style={{ fontSize: 12, color: "#9ca3af" }}>기본값 오늘 — 사방넷 주문일 기준 조회</span>
      </div>

      {/* 수도꼭지 1 — CJ 송장 엑셀 */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>CJ 송장 엑셀 생성</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
          사방넷 주문을 CJ 송장프로그램 업로드 양식(11컬럼)으로 변환합니다.
          수취인·주소·전화·수량·상품명·배송메시지·쇼핑몰주문번호·매출처명·주문번호·우편번호.
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
            {cjLoading ? "생성 중..." : "오늘 주문 → CJ 송장 엑셀 ↓"}
          </button>
        </div>

        {cjSummary && (
          <div style={{ marginTop: 16, border: "1px solid #e8eaed", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f9fafb", fontSize: 13, color: "#111827", fontWeight: 700 }}>
              오늘 주문 {cjSummary.order_count}건
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
                (상위 {cjSummary.preview.length}건 미리보기 · 전화·주소는 마스킹, 다운로드 파일은 원본)
              </span>
            </div>
            {cjSummary.preview.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderTop: "1px solid #e8eaed", borderBottom: "1px solid #e8eaed" }}>
                    {["수취인", "상품명", "매출처명", "전화", "주소"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cjSummary.preview.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
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
          수량=주문수량(ORD_CNT)·상품명=상품약어+옵션 — 임시 확정, 심유나 프로 확인 후 조정 가능
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
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderTop: "1px solid #e8eaed", borderBottom: "1px solid #e8eaed" }}>
                    {["사방넷주문번호", "채워질 운송장번호", "수취인", "상품약어"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.preview.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 16px", color: "#374151" }}>{p.sbOrdNo}</td>
                      <td style={{ padding: "8px 16px", color: "#374151" }}>{p.waybillNo}</td>
                      <td style={{ padding: "8px 16px", color: "#374151" }}>{p.receiverNm}</td>
                      <td style={{ padding: "8px 16px", color: "#6b7280" }}>{p.productAbbr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {matchMsg && <Msg msg={matchMsg} />}
      </div>
    </div>
  );
}
