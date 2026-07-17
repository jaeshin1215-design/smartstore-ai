"use client";

// T6 정산매출 자동화 (박혜미) — 사방넷 정산매출 원본 업로드 → 정제 엑셀 다운로드 + 채널별 요약.
//   계산·규칙: lib/settlement-process.ts + lib/settlement-rules.ts. IZ 전용(ProfitSimulatorTab에서 게이트).
import { useRef, useState } from "react";

interface ChannelRow {
  channel: string; count: number; AA: number; AB: number; U: number; margin: number; marginPct: number;
  mode: string; multiplier: number | null; resolved: boolean;
}
interface Summary {
  row_count: number; error_count: number;
  errors: { rowIndex: number; channel: string; field: string; raw: unknown }[];
  unresolved_channels: string[];
  channels: ChannelRow[];
  totals: { count: number; AA: number; AB: number; U: number; margin: number; marginPct: number };
}

const won = (n: number) => Math.round(n).toLocaleString() + "원";

export default function SettlementSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);

  async function preview() {
    if (!file) { setMsg({ ok: false, text: "사방넷 정산매출 엑셀을 먼저 선택하세요." }); return; }
    setLoading(true); setMsg(null); setSum(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/settlement?format=json", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) setMsg({ ok: false, text: j.error ?? `HTTP ${res.status}` });
      else setSum(j);
    } catch { setMsg({ ok: false, text: "네트워크 오류" }); }
    setLoading(false);
  }

  async function download() {
    if (!file) { setMsg({ ok: false, text: "파일을 먼저 선택하세요." }); return; }
    setLoading(true); setMsg(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/settlement?format=xlsx", { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json().catch(() => null); setMsg({ ok: false, text: j?.error ?? `HTTP ${res.status}` }); setLoading(false); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = m ? decodeURIComponent(m[1]) : "정산매출_정제후.xlsx"; a.click();
      URL.revokeObjectURL(a.href);
      setMsg({ ok: true, text: `정제 파일 다운로드 완료 — ${res.headers.get("X-Row-Count")}행 (오류 ${res.headers.get("X-Error-Count")}건)` });
    } catch { setMsg({ ok: false, text: "다운로드 오류" }); }
    setLoading(false);
  }

  const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: 24, marginTop: 20 };
  const btn = (primary: boolean): React.CSSProperties => ({ padding: "10px 22px", borderRadius: 8, border: primary ? "none" : "1px solid #e8eaed", background: primary ? (loading ? "#c4c8cc" : "#D4537E") : "#fff", color: primary ? "#fff" : "#374151", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "inherit" });

  return (
    <div style={CARD}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>정산매출 자동화 <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>(박혜미 프로 채널)</span></div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
        사방넷 정산매출 원본 엑셀을 업로드하면 손익 계산(배송비·매출·원가·부대비용·물류처 예외)이 자동 적용된 정제 파일을 생성합니다.
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSum(null); setMsg(null); }} />
        <button onClick={() => fileRef.current?.click()} style={btn(false)}>엑셀 파일 선택</button>
        {file && <span style={{ fontSize: 12, color: "#6b7280" }}>{file.name}</span>}
        <button onClick={preview} disabled={loading} style={btn(false)}>{loading ? "처리 중..." : "미리보기"}</button>
        <button onClick={download} disabled={loading} style={btn(true)}>정제 파일 다운로드 ↓</button>
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.ok ? "#86efac" : "#fecaca"}`, color: msg.ok ? "#15803d" : "#dc2626" }}>
          {msg.ok ? "✓ " : "⚠ "}{msg.text}
        </div>
      )}

      {sum && (
        <div style={{ marginTop: 16 }}>
          {sum.error_count > 0 && (
            <div style={{ padding: "9px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 12, color: "#c2410c", marginBottom: 10 }}>
              ⚠ 숫자 변환 오류 {sum.error_count}건 — 원본 셀 확인 필요 (예: {sum.errors.slice(0, 2).map((e) => `${e.rowIndex}행 ${e.field}="${e.raw}"`).join(", ")})
            </div>
          )}
          {sum.unresolved_channels.length > 0 && (
            <div style={{ padding: "9px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 12, color: "#c2410c", marginBottom: 10 }}>
              ⚠ 규칙 미등록 채널 {sum.unresolved_channels.length}개: {sum.unresolved_channels.join(", ")} — 공급가 0·배율 미적용으로 처리됨. 규칙 추가 필요.
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8eaed" }}>
                  {["채널", "건수", "AA 상품매출", "AB 상품총원가", "U 물류비", "매출이익", "매출이익률"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 10, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sum.channels.map((c) => (
                  <tr key={c.channel} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 600, color: "#0f2a1e", whiteSpace: "nowrap" }}>
                      {c.channel}
                      {c.mode === "manual" && c.multiplier != null && <span style={{ marginLeft: 5, fontSize: 10, color: "#f59e0b" }}>×{c.multiplier}</span>}
                      {!c.resolved && <span style={{ marginLeft: 5, fontSize: 10, color: "#dc2626" }}>규칙없음</span>}
                    </td>
                    <td style={{ padding: "9px 10px", color: "#6b7280" }}>{c.count}</td>
                    <td style={{ padding: "9px 10px", color: "#374151" }}>{won(c.AA)}</td>
                    <td style={{ padding: "9px 10px", color: "#374151" }}>{won(c.AB)}</td>
                    <td style={{ padding: "9px 10px", color: "#6b7280" }}>{won(c.U)}</td>
                    <td style={{ padding: "9px 10px", color: c.margin >= 0 ? "#374151" : "#dc2626" }}>{won(c.margin)}</td>
                    <td style={{ padding: "9px 10px", fontWeight: 700, color: c.marginPct >= 20 ? "#15803d" : c.marginPct >= 10 ? "#d97706" : "#dc2626" }}>{c.marginPct}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #e8eaed" }}>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151", fontSize: 11 }}>합계</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{sum.totals.count}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{won(sum.totals.AA)}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{won(sum.totals.AB)}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#6b7280" }}>{won(sum.totals.U)}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{won(sum.totals.margin)}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: "#15803d" }}>{sum.totals.marginPct}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p style={{ fontSize: 10, color: "#c0c4cc", marginTop: 10, lineHeight: 1.6 }}>
            매출이익=AA−AB (최종이익 아님, 광고비·배송비 제외 전) · 물류처 예외: 오포물류·유비엘 외 부자재·로스·물류비 제외 · T deal 0.85·보고류 0.9는 박혜미 회신 대기(보류) · 행 삭제 규칙 미적용(전 행 처리)
          </p>
        </div>
      )}
    </div>
  );
}
