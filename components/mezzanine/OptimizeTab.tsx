"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

function InputRow({ label, unit, value, onChange, placeholder, hint }: {
  label: string; unit?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: "0 0 5px 0" }}>
        {label}
      </p>
      {hint && <p style={{ fontSize: "10px", color: "#b0b5bc", margin: "0 0 5px 0", lineHeight: 1.4 }}>{hint}</p>}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input
          type="number" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "0"}
          style={{
            flex: 1, fontSize: "14px", fontWeight: 600, padding: "10px 14px",
            borderRadius: "8px", border: "1px solid #e8eaed",
            background: "#f9fafb", outline: "none", fontFamily: FF, color: "#1a1a1a",
          }}
        />
        {unit && <span style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap" }}>{unit}</span>}
      </div>
    </div>
  );
}

function ResultCard({ label, sub, value, highlight }: { label: string; sub: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      flex: 1, padding: "20px 18px", borderRadius: "10px",
      border: highlight ? "2px solid #3b4fd8" : "1px solid #e8eaed",
      background: highlight ? "#eff6ff" : "#fff",
    }}>
      <p style={{ fontSize: "10px", fontWeight: 600, color: highlight ? "#3b4fd8" : "#9ca3af", margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: "10px", color: "#b0b5bc", margin: "0 0 10px 0" }}>{sub}</p>
      <p style={{ fontSize: highlight ? "26px" : "20px", fontWeight: 800, color: highlight ? "#1d4ed8" : "#111827", margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

interface Props {
  selectedBrand?: {
    id: string; name: string; category: string;
    matrix_x: number; matrix_y: number;
  } | null;
}

export default function OptimizeTab({ selectedBrand }: Props) {
  // 건축주 입력
  const [anchorRent,    setAnchorRent]    = useState("");  // 앵커 월 임대료 (원)
  const [anchorSlots,   setAnchorSlots]   = useState("2"); // 앵커 칸 수
  const [popupIncome,   setPopupIncome]   = useState("");  // 팝업 칸당 수입 (원)
  const [fillRate,      setFillRate]      = useState("65"); // 채움률 %
  const [opex,          setOpex]          = useState("");  // 연 Opex
  const [capRate,       setCapRate]       = useState("5.2"); // Cap Rate %

  const [result, setResult] = useState<{
    annualNOI: number;
    assetGain: number;
    anchorIncome: number;
    popupAnnual: number;
  } | null>(null);

  const calc = () => {
    const ar  = Number(anchorRent)  || 0;
    const as_ = Number(anchorSlots) || 0;
    const pi  = Number(popupIncome) || 0;
    const fr  = Number(fillRate)    / 100;
    const ox  = Number(opex)        || 0;
    const cr  = Number(capRate)     / 100 || 0.052;

    const anchorIncome = ar * as_ * 12;
    const popupAnnual  = pi * 12 * fr;
    const annualNOI    = anchorIncome + popupAnnual - ox;
    const assetGain    = cr > 0 ? annualNOI / cr : 0;

    setResult({ annualNOI, assetGain, anchorIncome, popupAnnual });
  };

  const fmt = (n: number) => {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
    if (n >= 10_000)      return `${(n / 10_000).toFixed(0)}만원`;
    return n.toLocaleString("ko-KR") + "원";
  };

  const FILL_PRESETS = [
    { label: "보수 40%", value: "40" },
    { label: "기준 65%", value: "65" },
    { label: "적극 85%", value: "85" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0,720px)", gap: "0 25vw", fontFamily: FF }}>

      {/* ── 좌: 사이드바 ── */}
      <div style={{ background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
          NOI OPTIMIZER
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>
          1년 운영<br />자산가치 계산
        </p>
        <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>
          연 NOI ÷ Cap Rate<br />= 자산가치 증분
        </p>

        <div style={{ background: "#eff6ff", border: "1px solid #c7d2fe", borderRadius: "6px", padding: "8px 10px", marginBottom: "12px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#3b4fd8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>하이브리드 모델</p>
          {[
            "앵커 (A·B동) — 안정 수입",
            "팝업 (C동) — 채움률×수입",
            "연 NOI → 자산가치",
          ].map(t => (
            <div key={t} style={{ display: "flex", gap: "5px", alignItems: "flex-start", marginBottom: "3px" }}>
              <span style={{ fontSize: "9px", color: "#6272c4", flexShrink: 0, marginTop: "1px" }}>→</span>
              <span style={{ fontSize: "10px", color: "#4338ca", lineHeight: 1.35 }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#f9fafb", border: "1px solid #e8eaed", borderRadius: "6px", padding: "8px 10px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>서북권 기준</p>
          <p style={{ fontSize: "11px", color: "#374151", fontWeight: 600, margin: "0 0 2px 0" }}>Cap Rate 4.8~5.5%</p>
          <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>기준값 5.2% 사용</p>
        </div>

        {result && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>결과 요약</p>
            <p style={{ fontSize: "11px", color: "#3b4fd8", fontWeight: 700, margin: "0 0 2px 0" }}>연 NOI {fmt(result.annualNOI)}</p>
            <p style={{ fontSize: "13px", color: "#1d4ed8", fontWeight: 800, margin: 0 }}>자산가치 +{fmt(result.assetGain)}</p>
          </div>
        )}

        {selectedBrand && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", margin: "0 0 5px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>검토 중인 후보</p>
            <div style={{ background: "#eff6ff", borderRadius: "6px", border: "1px solid #c7d2fe", padding: "8px 10px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", margin: "0 0 2px 0" }}>{selectedBrand.name}</p>
              <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>#{selectedBrand.category}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 우: 계산기 ── */}
      <div>
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8eaed", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", padding: "24px 28px", marginBottom: "20px" }}>
          <DemoBadge note="건축주가 직접 숫자를 입력합니다. 예시 시뮬레이션 — 실제 계약 수치 입력 시 자산가치 증분이 자동 계산됩니다." />

          {/* 앵커 입력 */}
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ background: "#dbeafe", padding: "2px 7px", borderRadius: "4px", fontSize: "10px" }}>앵커 A·B동</span>
              3~6개월 고정 수입
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <InputRow label="앵커 월 임대료" unit="원/월" value={anchorRent} onChange={setAnchorRent}
                placeholder="예) 3000000" hint="동당 평균 임대료" />
              <InputRow label="앵커 칸 수" unit="동" value={anchorSlots} onChange={setAnchorSlots}
                placeholder="2" hint="A동·B동 = 기본 2" />
            </div>
          </div>

          {/* 팝업 입력 */}
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ background: "#fef3c7", padding: "2px 7px", borderRadius: "4px", fontSize: "10px" }}>팝업 C동</span>
              단기 채움률 × 수입
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "12px" }}>
              <InputRow label="팝업 칸당 수입" unit="원/회" value={popupIncome} onChange={setPopupIncome}
                placeholder="예) 2000000" hint="1~2개월 단기 팝업 1회 수입" />
            </div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              연간 채움률 — {fillRate}%
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {FILL_PRESETS.map(p => (
                <button key={p.value} onClick={() => setFillRate(p.value)}
                  style={{
                    flex: 1, padding: "7px", borderRadius: "6px", cursor: "pointer", fontFamily: FF,
                    border: `1px solid ${fillRate === p.value ? "#f59e0b" : "#e8eaed"}`,
                    background: fillRate === p.value ? "#fef3c7" : "#fafafa",
                    color: fillRate === p.value ? "#92400e" : "#6b7280",
                    fontSize: "11px", fontWeight: fillRate === p.value ? 700 : 400,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            <input type="range" min="0" max="100" step="5" value={fillRate}
              onChange={e => setFillRate(e.target.value)}
              style={{ width: "100%", accentColor: "#f59e0b" }} />
          </div>

          {/* 기타 입력 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <InputRow label="연 Opex" unit="원/년" value={opex} onChange={setOpex}
              placeholder="예) 12000000" hint="관리비·운영비 합계" />
            <InputRow label="Cap Rate" unit="%" value={capRate} onChange={setCapRate}
              placeholder="5.2" hint="서북권 기준 4.8~5.5%" />
          </div>

          <button onClick={calc} style={{
            width: "100%", padding: "14px", borderRadius: "8px",
            background: "#1d4ed8", color: "#fff", border: "none",
            fontSize: "15px", fontWeight: 800, cursor: "pointer", fontFamily: FF,
            letterSpacing: "-0.01em",
          }}>
            자산가치 계산하기 →
          </button>
        </div>

        {/* 결과 */}
        {result && (
          <div>
            {/* 3카드 */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <ResultCard label="앵커 연 수입" sub="월임대료 × 칸수 × 12" value={fmt(result.anchorIncome)} />
              <ResultCard label="팝업 연 수입" sub={`연간 × 채움률 ${fillRate}%`} value={fmt(result.popupAnnual)} />
              <ResultCard label="연 NOI" sub="앵커+팝업−Opex" value={fmt(result.annualNOI)} />
            </div>

            {/* 클라이맥스 카드 */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b4fd8 100%)",
              borderRadius: "14px", padding: "28px 32px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: "0 8px 32px rgba(59,79,216,0.25)",
            }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px 0" }}>
                  NOI ÷ Cap Rate {capRate}% =
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", margin: "0 0 4px 0" }}>
                  자산가치 증분
                </p>
                <p style={{ fontSize: "40px", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  +{fmt(result.assetGain)}
                </p>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: "0 0 4px 0" }}>연 NOI</p>
                <p style={{ fontSize: "22px", fontWeight: 700, color: "#93c5fd", margin: 0 }}>{fmt(result.annualNOI)}</p>
              </div>
            </div>

            <p style={{ fontSize: "10px", color: "#b0b5bc", marginTop: "10px", lineHeight: 1.55 }}>
              * 건축주 직접 입력값 기준 시뮬레이션. 실제 계약·세금·공실 리스크는 별도 검토 필요. 예시 배지 유지.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
