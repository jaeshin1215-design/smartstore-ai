"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

const PINK = { main: "#D4537E", mid: "#E89CB8", light: "#FBEAF0", text: "#993556" };
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8eaed",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

type Scenario = "conservative" | "moderate" | "aggressive";

interface ScenarioConfig {
  label: string;
  labelKo: string;
  color: string;
  dropSavingPct: number;
  marginImprovementPt: number;
  targetProfitRate: number;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  conservative: { label: "보수", labelKo: "안전 우선", color: "#4a9f6e", dropSavingPct: 3, marginImprovementPt: 1, targetProfitRate: 4.0 },
  moderate:     { label: "중간", labelKo: "균형 성장", color: PINK.main,  dropSavingPct: 7, marginImprovementPt: 3, targetProfitRate: 6.5 },
  aggressive:   { label: "비전", labelKo: "비전 목표", color: "#2563eb",  dropSavingPct: 12,marginImprovementPt: 5, targetProfitRate: 7.0 },
};

const MONTHS_KO = ["6월", "7월", "8월", "9월", "10월", "11월", "12월", "1월"];

interface Product { id: string; name: string; matrix_x?: number; matrix_y?: number; }

const DEMO_DROP: Product[] = [
  { id: "d1", name: "시스맥스 얇은 A4 투명 파일박스", matrix_x: 30, matrix_y: 25 },
  { id: "d2", name: "마이홈 벽걸이 대나무 수납선반", matrix_x: 25, matrix_y: 28 },
  { id: "d3", name: "다용도 이동식 수납 바구니 3단", matrix_x: 35, matrix_y: 22 },
  { id: "d4", name: "오피스 서랍 문서 정리 트레이", matrix_x: 28, matrix_y: 30 },
  { id: "d5", name: "노트북 거치대 겸 수납 받침대", matrix_x: 32, matrix_y: 20 },
];
const DEMO_STAR: Product[] = [
  { id: "s1", name: "시스맥스 멀티박스 12단", matrix_x: 67, matrix_y: 80 },
  { id: "s2", name: "오르가나이저 서랍 수납함 4칸", matrix_x: 72, matrix_y: 75 },
  { id: "s3", name: "아크릴 투명 수납함 리빙박스", matrix_x: 65, matrix_y: 78 },
];

const fmt = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString()}만`;
  return `${sign}${abs.toLocaleString()}원`;
};

export default function ProfitSimulatorTab() {
  const [scenario, setScenario] = useState<Scenario>("conservative");
  const [achievement, setAchievement] = useState(100);
  const [baseRevenue, setBaseRevenue] = useState(1770000000);
  const [opex, setOpex] = useState(890000000);
  const [baseGrossMargin, setBaseGrossMargin] = useState(52);
  const [products, setProducts] = useState<Product[]>([]);
  const [dropMode, setDropMode] = useState(false);
  const [showInputs, setShowInputs] = useState(false);

  // ② 정산/매출집계
  const [showSettlement, setShowSettlement] = useState(false);
  const [uploadedRows, setUploadedRows] = useState<Record<string, unknown>[]>([]);
  const [uploadCols, setUploadCols] = useState<string[]>([]);
  const [colChannel, setColChannel] = useState("");
  const [colSaleAmt, setColSaleAmt] = useState("");
  const [colCostAmt, setColCostAmt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ③ 채널별 광고 집계
  const [showAdBoard, setShowAdBoard] = useState(false);
  const [adRows, setAdRows] = useState([{ channel: "", adCost: "", roas: "" }]);

  useEffect(() => {
    const storeId = localStorage.getItem("sellfit_store_id");
    if (!storeId) return;
    fetch(`/api/products?store_id=${storeId}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {});
  }, []);

  const sc = SCENARIOS[scenario];

  // ── Diagnose quadrant classification ──────────────────────────────────────
  const starProducts = useMemo(() => products.filter(p => (p.matrix_x ?? 0) >= 50 && (p.matrix_y ?? 0) >= 50), [products]);
  const dropProducts = useMemo(() => products.filter(p => (p.matrix_x ?? 100) < 50 && (p.matrix_y ?? 100) < 50), [products]);
  const totalCount = products.length || 140;
  const starCount  = starProducts.length  || 24;
  const dropCount  = dropProducts.length  || 73;
  const seasonCount = Math.max(0, totalCount - starCount - dropCount);

  // ── FORMULA ───────────────────────────────────────────────────────────────
  // 핵심 전제: 드롭 매출은 효자·시즌 집중으로 메워 총 매출 17.7억 유지
  const newRevenue = baseRevenue;

  // 드롭 테스트 모드: ON = 관찰 중 (드롭 미실행 → 효과 30%) / OFF = 전체 투영
  const dropModeFactor = dropMode ? 0.3 : 1.0;
  const effectiveFactor = (achievement / 100) * dropModeFactor;

  // 시나리오 목표 (Wendy 설계서 3번 표 — 매출 17.7억 기준)
  const targetProfitRates: Record<Scenario, number> = {
    conservative: 4.0,
    moderate:     6.5,
    aggressive:   7.0,
  };
  const baselineProfitRate = 1.5;  // 현재 영업이익률
  const baselineProfit = baseRevenue * (baselineProfitRate / 100);
  const targetProfit   = baseRevenue * (targetProfitRates[scenario] / 100);

  // 달성률 × 드롭모드 팩터: 현재(1.5%) → 시나리오 목표로 선형 보간
  const operatingProfit = baselineProfit + (targetProfit - baselineProfit) * effectiveFactor;
  const profitRate = (operatingProfit / newRevenue) * 100;

  // 드롭 절감 운반비 · 마진율 (시각화용 — 영업이익에 포함됨)
  const opexSavings = opex * (sc.dropSavingPct / 100) * effectiveFactor;
  const improvedGrossMargin = baseGrossMargin + sc.marginImprovementPt * effectiveFactor;

  // ── 현금흐름 (정산지연 45일 반영) ─────────────────────────────────────────
  const monthlyProfit  = operatingProfit / 12;
  const monthlyRevenue = newRevenue / 12;
  // 초기 부채: 정산지연(1.5개월) + 반품(5%) + 운반비 선지출(3%)
  const startingCash = -(monthlyRevenue * 0.135);

  const cashFlowMonths = MONTHS_KO.map((_, i) => startingCash + monthlyProfit * (i + 1));

  const positiveTurnIdx   = cashFlowMonths.findIndex(v => v > 0);
  const positiveTurnLabel = positiveTurnIdx >= 0 ? MONTHS_KO[positiveTurnIdx] : "12월+";

  // ── SVG chart helpers ─────────────────────────────────────────────────────
  const chartW = 380; const chartH = 110;
  const midY   = chartH * 0.48;
  const maxVal = Math.max(...cashFlowMonths.map(Math.abs), 1) * 1.1;
  const toXY   = (v: number, i: number) => ({
    x: (i / (cashFlowMonths.length - 1)) * (chartW - 36) + 18,
    y: midY - (v / maxVal) * (midY * 0.88),
  });
  const svgPoints = cashFlowMonths.map((v, i) => { const p = toXY(v, i); return `${p.x},${p.y}`; }).join(" ");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* ── LEFT: Sidebar ── */}
      <div className="mb-6 lg:mb-0" style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed", position: "sticky", top: "60px", alignSelf: "start" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>OPTIMIZE</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>그래서 얼마 남나?</p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>비용 절감 → 이익 극대화</p>
        {["영업이익률 계기판", "월별 현금흐름", "드롭 테스트 모드"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", color: "#c0c4cc", flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: "13px", color: "#8f9399" }}>{f}</span>
          </div>
        ))}

        {/* Diagnose 연동 */}
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>Diagnose 연동</p>
          {[
            { label: "효자", count: starCount, color: PINK.main },
            { label: "드롭 후보", count: dropCount, color: "#6b7280" },
            { label: "시즌", count: seasonCount, color: "#f59e0b" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "13px", color: "#8f9399" }}>{item.label}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: item.color }}>{item.count}개</span>
            </div>
          ))}
          <p style={{ fontSize: "9px", color: "#c0c4cc", marginTop: "8px", lineHeight: 1.5 }}>
            Diagnose 매트릭스 기준 자동 계산
          </p>
        </div>
      </div>

      {/* ── RIGHT: Main content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: "1232px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ══ Hero ══ */}
        <div style={{ paddingBottom: "24px", borderBottom: "1px solid #e8eaed" }}>
          <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 8px" }}>OPTIMIZE</p>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827", margin: "0 0 6px" }}>Profit, Simulated.</h1>
          <p style={{ fontSize: "14px", color: "#4b5563", margin: 0, lineHeight: 1.75 }}>그래서 얼마 남나? — 비용 절감 → 이익 극대화</p>
        </div>

        {/* ══ BLOCK 1: 두 계기판 ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* 계기판 1: 영업이익률 */}
          <div style={{ ...CARD, padding: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "2px" }}>영업이익률</p>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>장기 체질 — 먼저 살고, 그 다음 남긴다</p>

            {/* Arc gauge (CSS based) */}
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: sc.color, lineHeight: 1 }}>{profitRate.toFixed(1)}</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: sc.color }}>%</span>
                <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "4px" }}>vs 현재 1.5%</span>
              </div>
              {/* Bar */}
              <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "4px" }}>
                <div style={{ height: "100%", width: `${Math.min((profitRate / 12) * 100, 100)}%`, background: sc.color, borderRadius: "3px", transition: "width 0.5s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9px", color: "#c0c4cc" }}>0%</span>
                <span style={{ fontSize: "9px", color: "#c0c4cc" }}>업계 평균 3~8%</span>
                <span style={{ fontSize: "9px", color: "#c0c4cc" }}>12%</span>
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "7px" }}>
              {[
                { label: "연 영업이익", value: fmt(operatingProfit), color: "#1a1a1a" },
                { label: "드롭 절감 운반비", value: `+${fmt(opexSavings)}`, color: sc.color },
                { label: "마진율 개선", value: `52% → ${improvedGrossMargin}%`, color: sc.color },
                { label: "신 매출 (드롭 후)", value: fmt(newRevenue), color: "#6b7280" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{r.label}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 계기판 2: 현금흐름 */}
          <div style={{ ...CARD, padding: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "2px" }}>월별 현금 잔고</p>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>당장의 생존 — 정산지연 45일 반영</p>

            {/* Callout */}
            <div style={{ background: positiveTurnIdx >= 0 ? "#f0fdf4" : "#fff7ed", border: `1px solid ${positiveTurnIdx >= 0 ? "#bbf7d0" : "#fed7aa"}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "13px", fontWeight: 800, color: positiveTurnIdx >= 0 ? "#15803d" : "#c2410c", marginBottom: "2px" }}>
                {positiveTurnIdx >= 0 ? `${positiveTurnLabel} 현금 플러스 전환` : "12월 이후 전환"}
              </p>
              <p style={{ fontSize: "10px", color: "#6b7280" }}>
                {positiveTurnIdx >= 0
                  ? `시작 후 ${positiveTurnIdx + 1}개월 — 보수 기준`
                  : "공격 시나리오 검토 권장"}
              </p>
            </div>

            {/* SVG chart */}
            <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: "visible", display: "block" }}>
              {/* Zero baseline */}
              <line x1="18" y1={midY} x2={chartW - 18} y2={midY} stroke="#e8eaed" strokeWidth="1" strokeDasharray="4,3" />

              {/* Positive zone shade */}
              {positiveTurnIdx >= 0 && (() => {
                const pts = cashFlowMonths.slice(positiveTurnIdx).map((v, i) => toXY(v, i + positiveTurnIdx));
                const x0 = pts[0].x; const xN = pts[pts.length - 1].x;
                const polyPts = [...pts.map(p => `${p.x},${p.y}`), `${xN},${midY}`, `${x0},${midY}`].join(" ");
                return <polygon points={polyPts} fill={sc.color} fillOpacity="0.08" />;
              })()}

              {/* Line */}
              <polyline points={svgPoints} fill="none" stroke={sc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Dots */}
              {cashFlowMonths.map((v, i) => {
                const { x, y } = toXY(v, i);
                const isTurn = i === positiveTurnIdx;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={isTurn ? 5 : 3} fill={isTurn ? sc.color : "#fff"} stroke={sc.color} strokeWidth="2" />
                    {isTurn && <circle cx={x} cy={y} r={9} fill="none" stroke={sc.color} strokeWidth="1.5" strokeOpacity="0.4" />}
                  </g>
                );
              })}

              {/* Month labels — 짝수 인덱스만 표시 */}
              {MONTHS_KO.map((m, i) => {
                if (i % 2 !== 0 && i !== MONTHS_KO.length - 1) return null;
                const { x } = toXY(0, i);
                return <text key={m} x={x} y={chartH} textAnchor="middle" fontSize="10" fill="#9ca3af" fontFamily="inherit">{m}</text>;
              })}
            </svg>

            <p style={{ fontSize: "11px", color: "#c0c4cc", marginTop: "6px", lineHeight: 1.6 }}>
              정산지연 45일 · 반품 5% · 운반비 선지출 반영 / 실데이터 입력 시 교정
            </p>
          </div>
        </div>

        {/* ══ BLOCK 2: 시나리오 + 슬라이더 ══ */}
        <div style={{ ...CARD, padding: "20px" }}>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "4px" }}>3단계 시나리오</p>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75 }}>보수 4%가 최소 현실선 · 공격 9%는 공급가 인하 협상까지 성공한 최상</p>
          </div>

          {/* Scenario toggles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            {(Object.entries(SCENARIOS) as [Scenario, ScenarioConfig][]).map(([key, s]) => {
              const active = scenario === key;
              return (
                <button
                  key={key}
                  onClick={() => setScenario(key)}
                  style={{
                    padding: "14px 8px", borderRadius: "10px",
                    border: `2px solid ${active ? s.color : "#e8eaed"}`,
                    background: active ? `${s.color}12` : "#fff",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: "12px", fontWeight: 700, color: active ? s.color : "#6b7280", marginBottom: "4px" }}>{s.label}</p>
                  <p style={{ fontSize: "20px", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: "4px" }}>{s.targetProfitRate}%</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af" }}>영업이익률 목표</p>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#9ca3af" }}>
                    <span>드롭절감 {s.dropSavingPct}% · 마진 +{s.marginImprovementPt}%p</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Achievement slider */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>달성률 민감도 슬라이더</p>
              <span style={{ fontSize: "14px", fontWeight: 800, color: sc.color }}>{achievement}%</span>
            </div>
            <input
              type="range" min={0} max={150} step={5} value={achievement}
              onChange={e => setAchievement(Number(e.target.value))}
              style={{ width: "100%", accentColor: sc.color, cursor: "pointer" }}
            />
            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.75, marginTop: "4px" }}>
              유사 셀러 벤치 기반 추정 · 실판매 데이터 1~2개월 입력 시 자동 교정
            </p>
          </div>

          {/* 3-metric summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {[
              { label: "드롭 절감 (판관비)", value: fmt(opexSavings), sub: `8.9억의 ${sc.dropSavingPct}%` },
              { label: "개선 매출총이익률", value: `${improvedGrossMargin}%`, sub: `52% → ${improvedGrossMargin}%p` },
              { label: "연 영업이익", value: fmt(operatingProfit), sub: `월 ${fmt(monthlyProfit)}` },
            ].map(c => (
              <div key={c.label} style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</p>
                <p style={{ fontSize: "17px", fontWeight: 900, color: sc.color, marginBottom: "3px" }}>{c.value}</p>
                <p style={{ fontSize: "11px", color: "#9ca3af" }}>{c.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ BLOCK 3: Quick Win + Drop Test Mode ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Quick Win 액션 리스트 */}
          <div style={{ ...CARD, padding: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px" }}>Quick Win 액션</p>

            {/* 드롭 Top5 */}
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>드롭 후보 Top 5 <span style={{ fontSize: "11px", fontWeight: 400, color: "#9ca3af" }}>— 테스트 모드로 안전하게</span></p>
            {(dropProducts.length > 0 ? dropProducts : DEMO_DROP).slice(0, 5).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < 4 ? "1px solid #f3f4f6" : "none" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", width: "14px", flexShrink: 0 }}>{i + 1}</span>
                <p style={{ fontSize: "14px", color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <span style={{ fontSize: "11px", background: "#f3f4f6", borderRadius: "4px", padding: "1px 6px", color: "#6b7280", flexShrink: 0 }}>
                  수요{p.matrix_x ?? 0} 마진{p.matrix_y ?? 0}
                </span>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "14px", paddingTop: "14px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>효자 Top 3 집중 <span style={{ fontSize: "11px", fontWeight: 400, color: "#9ca3af" }}>— 광고 예산 집중</span></p>
              {(starProducts.length > 0 ? starProducts : DEMO_STAR).slice(0, 3).map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: "13px", color: PINK.main, width: "14px", flexShrink: 0 }}>★</span>
                  <p style={{ fontSize: "14px", color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <span style={{ fontSize: "11px", background: PINK.light, borderRadius: "4px", padding: "1px 6px", color: PINK.text, flexShrink: 0 }}>
                    마진{p.matrix_y ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 드롭 테스트 모드 */}
          <div style={{ ...CARD, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>드롭 테스트 모드</p>
              <button
                onClick={() => setDropMode(!dropMode)}
                style={{
                  fontSize: "11px", fontWeight: 700, padding: "4px 12px",
                  borderRadius: "20px", border: "none", cursor: "pointer",
                  background: dropMode ? PINK.main : "#f3f4f6",
                  color: dropMode ? "#fff" : "#6b7280",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {dropMode ? "ON · 관찰 중" : "OFF"}
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>
              73개를 한 번에 빼지 않습니다. 드롭하면 롱테일 매출이 20~40% 빠질 수 있습니다 (Grok 경고).
            </p>

            {[
              { step: "1", label: "관찰 시작", desc: "드롭 후보를 '관찰' 표시 — 판매는 계속", color: "#6b7280", bg: "#f9fafb", border: "#e8eaed" },
              { step: "2", label: "1개월 모니터링", desc: "효자·번들 매출 영향 데이터 확인", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
              { step: "3", label: "드롭 결정", desc: "타격 없으면 드롭 · 있으면 롱테일 → 유지", color: PINK.main, bg: PINK.light, border: PINK.mid },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: "10px", marginBottom: "10px", padding: "10px", borderRadius: "8px", background: s.bg, border: `1px solid ${s.border}` }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: s.color, color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {s.step}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px" }}>{s.label}</p>
                  <p style={{ fontSize: "10px", color: "#6b7280" }}>{s.desc}</p>
                </div>
              </div>
            ))}

            <div style={{ background: "#fff9f0", border: "1px solid #fed7aa", borderRadius: "6px", padding: "8px 12px", marginTop: "4px" }}>
              <p style={{ fontSize: "10px", color: "#c2410c", fontWeight: 700 }}>⚠️ 정직 표시</p>
              <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px", lineHeight: 1.6 }}>
                드롭 효과는 가정값 · 실판매 1~2개월로 교정 · 단정하지 않습니다
              </p>
            </div>
          </div>
        </div>

        {/* ══ 기준값 수정 패널 ══ */}
        <div style={{ ...CARD }}>
          <button
            onClick={() => setShowInputs(!showInputs)}
            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>기준값 수정 (이지스토리 2026년 실측)</span>
            <span style={{ fontSize: "11px", color: "#9ca3af", transform: showInputs ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>
          {showInputs && (
            <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", borderTop: "1px solid #f3f4f6" }}>
              {[
                { label: "연 매출 (원)", value: baseRevenue, set: setBaseRevenue },
                { label: "판관비 (원)", value: opex, set: setOpex },
                { label: "기준 매출총이익률 (%)", value: baseGrossMargin, set: setBaseGrossMargin },
              ].map(f => (
                <div key={f.label} style={{ paddingTop: "14px" }}>
                  <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
                  <input
                    type="number" value={f.value}
                    onChange={e => f.set(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", background: "#f9fafb", fontSize: "13px", color: "#1a1a1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ══ BLOCK 4: 정산/매출집계 ══ */}
        <div style={{ ...CARD }}>
          <button
            onClick={() => setShowSettlement(!showSettlement)}
            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>정산/매출집계</span>
              <span style={{ fontSize: "10px", background: "#fef3c7", color: "#92400e", padding: "1px 7px", borderRadius: "9px", fontWeight: 600 }}>Phase 1</span>
            </div>
            <span style={{ fontSize: "11px", color: "#9ca3af", transform: showSettlement ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>

          {showSettlement && (
            <div style={{ padding: "0 20px 24px", borderTop: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.7, marginTop: "14px", marginBottom: "16px" }}>
                사방넷 엑셀(xlsx/xls/csv)을 업로드하면 채널별 마진을 자동 계산합니다.<br />
                <span style={{ color: "#9ca3af" }}>컬럼명 선택 → 계산 실행 → 결과 보드 순서.</span>
              </p>

              {/* 업로드 */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = evt => {
                      const buf = evt.target?.result;
                      const wb = XLSX.read(buf, { type: "array" });
                      const ws = wb.Sheets[wb.SheetNames[0]];
                      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
                      setUploadedRows(rows);
                      setUploadCols(rows.length > 0 ? Object.keys(rows[0]) : []);
                      setColChannel(""); setColSaleAmt(""); setColCostAmt("");
                    };
                    reader.readAsArrayBuffer(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #e8eaed", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}
                >
                  엑셀 파일 선택
                </button>
                {uploadedRows.length > 0 && (
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{uploadedRows.length}건 로드됨 · {uploadCols.length}개 컬럼</span>
                )}
              </div>

              {/* 컬럼 선택 */}
              {uploadCols.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "채널명 컬럼", value: colChannel, set: setColChannel },
                    { label: "판매금액 컬럼 (VAT포함)", value: colSaleAmt, set: setColSaleAmt },
                    { label: "원가 컬럼 (VAT포함)", value: colCostAmt, set: setColCostAmt },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
                      <select
                        value={f.value}
                        onChange={e => f.set(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", background: "#fff", fontSize: "12px", color: "#374151", fontFamily: "inherit", cursor: "pointer" }}
                      >
                        <option value="">— 선택 —</option>
                        {uploadCols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* 결과 보드 */}
              {colChannel && colSaleAmt && colCostAmt && uploadedRows.length > 0 && (() => {
                const MULTIPLIERS: Record<string, number> = {
                  "띵샵": 0.88, "원룸만들기": 0.85, "현대홈쇼핑": 1.1,
                  "블루베리": 0.85, "이모야킨지로": 0.8,
                };
                const grouped: Record<string, { R: number; O: number; count: number }> = {};
                for (const row of uploadedRows) {
                  const ch = String(row[colChannel] ?? "기타").trim();
                  const sale = Number(row[colSaleAmt]) || 0;
                  const cost = Number(row[colCostAmt]) || 0;
                  if (!grouped[ch]) grouped[ch] = { R: 0, O: 0, count: 0 };
                  const mult = MULTIPLIERS[ch] ?? 1.0;
                  grouped[ch].R += (sale / 1.1) * mult;
                  grouped[ch].O += cost / 1.1;
                  grouped[ch].count += 1;
                }
                const rows = Object.entries(grouped).map(([ch, { R, O, count }]) => {
                  const S = R * 0.02; const T = R * 0.02;
                  const margin = R > 0 ? ((R - O - S - T) / R) * 100 : 0;
                  const mult = MULTIPLIERS[ch] ?? 1.0;
                  return { ch, R, O, S, T, margin, count, mult };
                }).sort((a, b) => b.R - a.R);
                const totalR = rows.reduce((s, r) => s + r.R, 0);
                return (
                  <div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>채널별 마진 보드 · 총 {uploadedRows.length}건</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e8eaed" }}>
                            {["채널", "건수", "배율", "VAT제외매출", "마진율", "S+T(수수료)"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: "10px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.ch} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "9px 10px", fontWeight: 600, color: "#0f2a1e" }}>{r.ch}</td>
                              <td style={{ padding: "9px 10px", color: "#6b7280" }}>{r.count}</td>
                              <td style={{ padding: "9px 10px", color: r.mult !== 1 ? "#f59e0b" : "#6b7280" }}>{r.mult !== 1 ? `×${r.mult}` : "일반"}</td>
                              <td style={{ padding: "9px 10px", color: "#374151" }}>{Math.round(r.R).toLocaleString()}원</td>
                              <td style={{ padding: "9px 10px", fontWeight: 700, color: r.margin >= 20 ? "#15803d" : r.margin >= 10 ? "#d97706" : "#dc2626" }}>{r.margin.toFixed(1)}%</td>
                              <td style={{ padding: "9px 10px", color: "#6b7280" }}>{Math.round(r.S + r.T).toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: "2px solid #e8eaed" }}>
                            <td colSpan={3} style={{ padding: "9px 10px", fontWeight: 700, color: "#374151", fontSize: "11px" }}>합계</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{Math.round(totalR).toLocaleString()}원</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p style={{ fontSize: "10px", color: "#c0c4cc", marginTop: "10px", lineHeight: 1.6 }}>
                      이모야킨지로 ×0.8 — 확인 필요 (지시서 명시) · Phase2: 사방넷 API 연동 시 업로드 단계 제거, 계산 로직 재사용
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ══ BLOCK 5: 채널별 광고 집계 ══ */}
        <div style={{ ...CARD }}>
          <button
            onClick={() => setShowAdBoard(!showAdBoard)}
            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>채널별 광고 집계</span>
              <span style={{ fontSize: "10px", background: "#ede9fe", color: "#6d28d9", padding: "1px 7px", borderRadius: "9px", fontWeight: 600 }}>수동입력</span>
            </div>
            <span style={{ fontSize: "11px", color: "#9ca3af", transform: showAdBoard ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>

          {showAdBoard && (
            <div style={{ padding: "0 20px 24px", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "14px", marginBottom: "16px", lineHeight: 1.6 }}>
                ※ 이다슬 프로 답변 확인 후 스펙 조정 예정 — 현재는 수동 입력 최소 버전
              </div>

              {/* 입력 행들 */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
                {["채널명", "주간 광고비 (원)", "ROAS", ""].map(h => (
                  <div key={h} style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", padding: "0 4px" }}>{h}</div>
                ))}
              </div>
              {adRows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
                  <input
                    placeholder="예) 스마트스토어"
                    value={row.channel}
                    onChange={e => setAdRows(prev => prev.map((r, j) => j === i ? { ...r, channel: e.target.value } : r))}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", fontSize: "12px", fontFamily: "inherit", outline: "none" }}
                  />
                  <input
                    type="number" placeholder="예) 150000"
                    value={row.adCost}
                    onChange={e => setAdRows(prev => prev.map((r, j) => j === i ? { ...r, adCost: e.target.value } : r))}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", fontSize: "12px", fontFamily: "inherit", outline: "none" }}
                  />
                  <input
                    type="number" placeholder="예) 3.2"
                    value={row.roas}
                    onChange={e => setAdRows(prev => prev.map((r, j) => j === i ? { ...r, roas: e.target.value } : r))}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", fontSize: "12px", fontFamily: "inherit", outline: "none" }}
                  />
                  <button
                    onClick={() => setAdRows(prev => prev.filter((_, j) => j !== i))}
                    style={{ padding: "8px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "14px" }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => setAdRows(prev => [...prev, { channel: "", adCost: "", roas: "" }])}
                style={{ fontSize: "12px", color: "#6b7280", background: "none", border: "1px dashed #e8eaed", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", marginBottom: "16px" }}
              >
                + 채널 추가
              </button>

              {/* 집계 결과 */}
              {adRows.some(r => r.channel && r.adCost) && (
                <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>주간 집계</div>
                  {adRows.filter(r => r.channel && r.adCost).map((r, i) => {
                    const cost = Number(r.adCost) || 0;
                    const roas = Number(r.roas) || 0;
                    const rev = roas > 0 ? cost * roas : null;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{r.channel}</span>
                        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6b7280" }}>
                          <span>광고비 {cost.toLocaleString()}원</span>
                          {roas > 0 && <span style={{ color: roas >= 3 ? "#15803d" : "#d97706", fontWeight: 700 }}>ROAS {roas.toFixed(1)}</span>}
                          {rev && <span>추정매출 {Math.round(rev).toLocaleString()}원</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#9ca3af" }}>총 광고비</span>
                    <span style={{ fontWeight: 700, color: "#374151" }}>
                      {adRows.filter(r => r.adCost).reduce((s, r) => s + (Number(r.adCost) || 0), 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
