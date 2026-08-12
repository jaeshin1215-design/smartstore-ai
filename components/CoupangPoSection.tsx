"use client";

// 쿠팡 로켓배송 발주서 취합 (박혜미) — 개별 발주서(다중 파일/zip) 업로드 → 물류센터별 시트 + 전체 취합 다운로드.
//   로직: lib/coupang-po.ts + app/api/coupang-po. 정산·배송비와 코드 공유 없음(별개 기능).
import { useRef, useState } from "react";

interface CenterRow { center: string; poCount: number; itemCount: number; }
interface Summary {
  file_count: number; ok_count: number; fail_count: number;
  center_count: number; item_count: number; total_purchase: number;
  arrivals: string[]; centers: CenterRow[]; failed: { file: string; reason: string }[];
}
const won = (n: number) => Math.round(n).toLocaleString() + "원";

export default function CoupangPoSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);

  const build = (fd: FormData) => { for (const f of files) fd.append("files", f); return fd; };

  async function preview() {
    if (!files.length) { setMsg({ ok: false, text: "발주서 파일(.xlsx 여러 개) 또는 zip을 선택해주세요." }); return; }
    setLoading(true); setMsg(null); setSum(null);
    try {
      const res = await fetch("/api/coupang-po?format=json", { method: "POST", body: build(new FormData()) });
      const j = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: j.error ?? "요약 실패" }); return; }
      setSum(j as Summary);
      setMsg({ ok: true, text: `발주서 ${j.ok_count}건 인식 · 물류센터 ${j.center_count}개 · 상품 ${j.item_count}건${j.fail_count ? ` · ⚠ 인식실패 ${j.fail_count}건` : ""}` });
    } catch (e) { setMsg({ ok: false, text: "요약 오류: " + (e as Error).message }); } finally { setLoading(false); }
  }

  async function download() {
    if (!files.length) { setMsg({ ok: false, text: "파일을 먼저 선택해주세요." }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/coupang-po", { method: "POST", body: build(new FormData()) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg({ ok: false, text: (j as { error?: string }).error ?? "다운로드 실패" }); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = m ? decodeURIComponent(m[1]) : "쿠팡발주서_취합.xlsx"; a.click(); URL.revokeObjectURL(a.href);
      setMsg({ ok: true, text: "취합 파일 다운로드 완료 (전체 시트 + 물류센터별 시트)." });
    } catch (e) { setMsg({ ok: false, text: "다운로드 오류: " + (e as Error).message }); } finally { setLoading(false); }
  }

  const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: 24, marginTop: 20 };
  const BTN: React.CSSProperties = { padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={CARD}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>쿠팡 발주서 취합 <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>물류센터별 · 전체</span></div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
        Supplier Hub에서 받은 <b>개별 발주서(.xlsx 여러 개)</b> 또는 <b>.zip</b>을 올리면, 물류센터별 시트로 분리·누적하고 전체 취합 시트를 더해 한 파일로 내려받습니다. (사방넷 교환발주서·정산과 별개)
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.zip" multiple style={{ display: "none" }}
        onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setSum(null); setMsg(null); }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button style={{ ...BTN, background: "#f3f4f6", color: "#374151" }} onClick={() => fileRef.current?.click()}>파일 선택</button>
        <button style={{ ...BTN, background: loading ? "#c7d2fe" : "#eef2ff", color: "#4338ca" }} disabled={loading} onClick={preview}>{loading ? "처리 중..." : "요약 보기"}</button>
        <button style={{ ...BTN, background: loading ? "#a7f3d0" : "#059669", color: "#fff" }} disabled={loading} onClick={download}>취합 다운로드 ↓</button>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{files.length ? `${files.length}개 선택됨` : "선택된 파일 없음"}</span>
      </div>
      {msg && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.ok ? "#86efac" : "#fecaca"}`, color: msg.ok ? "#15803d" : "#dc2626" }}>{msg.text}</div>
      )}
      {sum && (
        <div style={{ marginTop: 16 }}>
          {sum.arrivals.length > 1 && (
            <div style={{ padding: "9px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 12, color: "#c2410c", marginBottom: 10 }}>
              ⚠ 입고예정일이 {sum.arrivals.length}종({sum.arrivals.join(", ")}) 섞여 있습니다 — 전체 시트명은 "전체"로 나갑니다(단일 날짜면 MMDD).
            </div>
          )}
          {sum.failed.length > 0 && (
            <div style={{ padding: "9px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#dc2626", marginBottom: 10 }}>
              ⚠ 인식 실패 {sum.failed.length}건: {sum.failed.slice(0, 6).map((f) => f.file).join(", ")}{sum.failed.length > 6 ? " 외" : ""} — 쿠팡 발주서 양식인지 확인
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ borderBottom: "1px solid #e8eaed" }}>{["물류센터", "발주서 수", "상품 수"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 10, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
              <tbody>
                {sum.centers.map((c) => (
                  <tr key={c.center} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f2a1e" }}>{c.center}</td>
                    <td style={{ padding: "8px 10px", color: "#6b7280" }}>{c.poCount}</td>
                    <td style={{ padding: "8px 10px", color: "#374151" }}>{c.itemCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ borderTop: "2px solid #e8eaed" }}>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#374151" }}>합계 {sum.center_count}센터</td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#374151" }}>{sum.ok_count}</td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#374151" }}>{sum.item_count}</td>
              </tr></tfoot>
            </table>
          </div>
          <p style={{ fontSize: 10, color: "#c0c4cc", marginTop: 10, lineHeight: 1.6 }}>총 매입금액 {won(sum.total_purchase)} · 입고예정일 {sum.arrivals.join(", ") || "-"} · 출력 = 전체 취합 시트 1개 + 물류센터별 시트 {sum.center_count}개.</p>
        </div>
      )}
    </div>
  );
}
