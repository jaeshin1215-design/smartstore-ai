"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

interface Result {
  ownerNOI: number;
  brandCost: number;
  opFee: number;
  brandROI: number;
  signal: "green" | "yellow" | "red";
}

function NOIBar({ rate, label }: { rate: number; label: string }) {
  const clamped = Math.min(Math.max(rate, 0), 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
        <span style={{ color: "#9ca3af" }}>{label}</span>
        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{rate.toFixed(1)}%</span>
      </div>
      <div style={{ height: "10px", borderRadius: "999px", background: "#e8eaed" }}>
        <div style={{
          height: "10px", borderRadius: "999px",
          width: `${clamped}%`, background: "#3b4fd8", transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function Signal({ s }: { s: "green" | "yellow" | "red" }) {
  const cfg = {
    green:  { bg: "#f0fdf4", border: "#86efac", color: "#15803d", label: "입점 적합", sub: "ROI 2.0× 이상" },
    yellow: { bg: "#fefce8", border: "#fde68a", color: "#92400e", label: "조건 협의", sub: "ROI 1.5~2.0×" },
    red:    { bg: "#fef2f2", border: "#fca5a5", color: "#dc2626", label: "재검토 필요", sub: "ROI 1.5× 미만" },
  }[s];
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: "8px", padding: "12px 16px",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: "13px", fontWeight: 700, color: cfg.color, margin: "0 0 2px 0" }}>{cfg.label}</p>
        <p style={{ fontSize: "11px", color: cfg.color, margin: 0, opacity: 0.75 }}>{cfg.sub}</p>
      </div>
    </div>
  );
}

function InputRow({ label, unit, value, onChange, placeholder }: {
  label: string; unit?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 6px 0" }}>
        {label}
      </p>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "0"}
          style={{
            flex: 1, fontSize: "13px", padding: "10px 14px",
            borderRadius: "8px", border: "1px solid #e8eaed",
            background: "#f9fafb", outline: "none",
            fontFamily: FF, color: "#1a1a1a",
          }}
        />
        {unit && <span style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap" }}>{unit}</span>}
      </div>
    </div>
  );
}

function ResultCard({ title, sub, value, color }: { title: string; sub: string; value: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: "20px 18px", borderRadius: "10px",
      border: "1px solid #e8eaed", background: "#fff",
    }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</p>
      <p style={{ fontSize: "11px", color: "#b0b5bc", margin: "0 0 12px 0" }}>{sub}</p>
      <p style={{ fontSize: "22px", fontWeight: 800, color, margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

export default function OptimizeTab() {
  const [rent, setRent]         = useState("");
  const [mgmt, setMgmt]         = useState("");
  const [capex, setCapex]       = useState("");
  const [opFeeRate, setOpFeeRate] = useState("10");
  const [weeks, setWeeks]       = useState("4");
  const [result, setResult]     = useState<Result | null>(null);

  const calc = () => {
    const r  = Number(rent)      || 0;
    const m  = Number(mgmt)      || 0;
    const cx = Number(capex)     || 0;
    const op = Number(opFeeRate) || 0;
    const w  = Number(weeks)     || 4;

    const ownerNOI  = Math.round(r * 0.85);
    const opFee     = Math.round(r * op / 100);
    const capexAmort= Math.round(cx / (w / 4));
    const brandCost = r + m + capexAmort;
    const brandROI  = brandCost > 0 ? Math.round((r / brandCost) * 100) / 100 : 0;
    const signal: "green" | "yellow" | "red" =
      brandROI >= 2.0 ? "green" : brandROI >= 1.5 ? "yellow" : "red";

    setResult({ ownerNOI, brandCost, opFee, brandROI, signal });
  };

  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "200px minmax(0,720px)",
      gap: "0 48px",
      fontFamily: FF,
    }}>

      {/* 좌: Hero Sidebar */}
      <div style={{
        background: "#F7F8FA", borderRadius: "8px",
        padding: "14px 12px", borderRight: "1px solid #e8eaed",
      }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
          P&L OPTIMIZER
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>
          입점 경제성<br />얼마나 맞나?
        </p>
        <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>
          임대료 → 건축주 NOI<br />브랜드 수지 시뮬레이션
        </p>
        {["건축주 NOI 자동 계산", "브랜드 ROI 신호등", "CapEx 상각 처리"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", color: "#c0c4cc", flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: "11px", color: "#8f9399" }}>{f}</span>
          </div>
        ))}

        {result && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>결과 요약</p>
            <NOIBar rate={result.brandROI * 50} label={`ROI ${result.brandROI.toFixed(2)}×`} />
          </div>
        )}
      </div>

      {/* 우: 폼 + 결과 */}
      <div>
        {/* 폼 카드 */}
        <div style={{
          background: "#fff", borderRadius: "12px",
          border: "1px solid #e8eaed",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          padding: "24px 28px", marginBottom: "20px",
        }}>
          <DemoBadge note="예시 시뮬레이션 — 실제 임대 계약 수치를 입력하면 건축주 NOI와 브랜드 ROI가 자동 계산됩니다." />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <InputRow label="임대료 (월)" unit="원" value={rent} onChange={setRent} placeholder="예) 3000000" />
            <InputRow label="관리비 (월)" unit="원" value={mgmt} onChange={setMgmt} placeholder="예) 500000" />
            <InputRow label="설치비 CapEx" unit="원" value={capex} onChange={setCapex} placeholder="예) 2000000" />
            <InputRow label="계약 기간" unit="주" value={weeks} onChange={setWeeks} placeholder="4" />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 8px 0" }}>
              운영사 관리비율 — {opFeeRate}%
            </p>
            <input
              type="range" min="0" max="30" step="1"
              value={opFeeRate}
              onChange={e => setOpFeeRate(e.target.value)}
              style={{ width: "100%", accentColor: "#3b4fd8" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#b0b5bc" }}>
              <span>0%</span><span>15%</span><span>30%</span>
            </div>
          </div>

          <button onClick={calc} style={{
            width: "100%", padding: "13px", borderRadius: "8px",
            background: "#3b4fd8", color: "#fff", border: "none",
            fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: FF,
          }}>
            P&L 시뮬레이션 실행
          </button>
        </div>

        {/* 결과 */}
        {result && (
          <div>
            {/* 신호등 */}
            <div style={{ marginBottom: "16px" }}>
              <Signal s={result.signal} />
            </div>

            {/* 3컬럼 카드 */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <ResultCard
                title="건축주 NOI"
                sub="임대료 × 85%"
                value={fmt(result.ownerNOI)}
                color="#111827"
              />
              <ResultCard
                title="브랜드 월 지출"
                sub="임대+관리+CapEx상각"
                value={fmt(result.brandCost)}
                color="#374151"
              />
              <ResultCard
                title="운영사 Fee"
                sub={`임대료 × ${opFeeRate}%`}
                value={fmt(result.opFee)}
                color="#6272c4"
              />
            </div>

            {/* ROI 바 */}
            <div style={{
              background: "#fff", borderRadius: "10px",
              border: "1px solid #e8eaed",
              padding: "18px 20px",
            }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: "0 0 12px 0" }}>
                브랜드 입점 ROI 지수 (임대료 ÷ 총 지출)
              </p>
              <NOIBar
                rate={Math.min(result.brandROI * 50, 100)}
                label={`${result.brandROI.toFixed(2)}× (목표 2.0×)`}
              />
              <p style={{ fontSize: "11px", color: "#9ca3af", margin: "10px 0 0 0", lineHeight: 1.55 }}>
                * ROI 2.0× = 브랜드가 지출 대비 임대료 회수 후 수익 가능 기준선
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
