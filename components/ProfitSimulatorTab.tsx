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

const IZ_STORE_ID = "984f8d32-6d13-402a-b251-9bedaf0b1f6a"; // 이지스토리 — izStory 프리셋

type Scenario = "conservative" | "moderate" | "aggressive";

interface ScenarioConfig {
  label: string;
  labelKo: string;
  color: string;
  dropSavingPct: number;
  marginImprovementPt: number;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  conservative: { label: "보수", labelKo: "안전 우선", color: "#4a9f6e", dropSavingPct: 3, marginImprovementPt: 1 },
  moderate:     { label: "중간", labelKo: "균형 성장", color: PINK.main,  dropSavingPct: 7, marginImprovementPt: 3 },
  aggressive:   { label: "비전", labelKo: "비전 목표", color: "#2563eb",  dropSavingPct: 12,marginImprovementPt: 5 },
};

const MONTHS_KO = ["6월", "7월", "8월", "9월", "10월", "11월", "12월", "1월"];

interface Product { id: string; name: string; matrix_x?: number; matrix_y?: number; }

// ── 프리셋 (store별 이원화, 2026-07-14) ──────────────────────────────────────
interface SimPreset {
  requireInput: boolean;                                    // generic: 입력 전 게이팅
  defaults: { revenue: number; opex: number; grossMargin: number; baselineProfitRate: number };
  fixedTargets: Record<Scenario, number> | null;            // izStory 고정 / generic null=상대공식
  relativeOffsets: Record<Scenario, number>;                // generic: 현재 영업이익률 + N%p
  terms: { drop: string; star: string };
  baseValueLabel: string;
  scenarioConclusion: string;
  dropBlockText: (n: number) => string;
  demoDrop: Product[];
  demoStar: Product[];
  settlementMultipliers: Record<string, number>;            // 채널별 정산 배율 (izStory 실측 / generic 없음)
  settlementNote: string;
  // 이지스토리 정산 규칙 (izStory 전용, generic은 undefined → 규칙 미적용 = 표준 계산)
  //   이다슬 프로 규칙서 원문 (2026-07-15 확정)
  settlementRules?: {
    swapMNChannels: string[];                    // 이 채널은 N_calc = rawN × 배율 (원룸만들기: M←rawN 스왑)
    shippingMultipliers: Record<string, number>; // 배송비매출 G에 곱하는 배율 (스마트스토어 0.96 · 이모야킨지로 0)
    crossLogistics: string[];                    // 물류처가 이 목록이 아니면 S·T·U=0 (오포물류 · 유비엘)
    zeroCostChannels: string[];                  // 원가 R=0 강제 (이모야킨지로 — 2026-07-16 이다슬 확정)
  };
}

const IZ_DROP: Product[] = [
  { id: "d1", name: "시스맥스 얇은 A4 투명 파일박스", matrix_x: 30, matrix_y: 25 },
  { id: "d2", name: "마이홈 벽걸이 대나무 수납선반", matrix_x: 25, matrix_y: 28 },
  { id: "d3", name: "다용도 이동식 수납 바구니 3단", matrix_x: 35, matrix_y: 22 },
  { id: "d4", name: "오피스 서랍 문서 정리 트레이", matrix_x: 28, matrix_y: 30 },
  { id: "d5", name: "노트북 거치대 겸 수납 받침대", matrix_x: 32, matrix_y: 20 },
];
const IZ_STAR: Product[] = [
  { id: "s1", name: "시스맥스 멀티박스 12단", matrix_x: 67, matrix_y: 80 },
  { id: "s2", name: "오르가나이저 서랍 수납함 4칸", matrix_x: 72, matrix_y: 75 },
  { id: "s3", name: "아크릴 투명 수납함 리빙박스", matrix_x: 65, matrix_y: 78 },
];

const IZ_PRESET: SimPreset = {
  requireInput: false,
  defaults: { revenue: 1770000000, opex: 890000000, grossMargin: 52, baselineProfitRate: 1.5 },
  fixedTargets: { conservative: 4.0, moderate: 6.5, aggressive: 7.0 },
  relativeOffsets: { conservative: 2, moderate: 4, aggressive: 6 },
  terms: { drop: "드롭", star: "효자" },
  baseValueLabel: "기준값 수정 (이지스토리 2026년 실측)",
  scenarioConclusion: "보수 4%가 최소 현실선 · 공격 9%는 공급가 인하 협상까지 성공한 최상",
  dropBlockText: () => "73개를 한 번에 빼지 않습니다. 드롭하면 롱테일 매출이 20~40% 빠질 수 있습니다 (Grok 경고).",
  demoDrop: IZ_DROP,
  demoStar: IZ_STAR,
  // 채널명은 규칙서 원문 표기로 완전일치 (2026-07-15 이다슬 확정 — 정규화·부분일치 없음)
  settlementMultipliers: { "띵샵(신)": 0.88, "원룸만들기": 0.85, "현대홈쇼핑(3)": 1.1, "(통합)블루베리": 0.85, "이모야킨지로": 0.08 },
  settlementRules: {
    // rawN 기반 채널(N_calc = rawN × 배율): 원룸만들기 ×0.85, 현대홈쇼핑(3) ×1.1
    //   (규칙서: 현대홈쇼핑 "N란 내용변경 = 기존데이터×1.1") · 나머지 특수는 M×배율
    swapMNChannels: ["원룸만들기", "현대홈쇼핑(3)"],
    shippingMultipliers: { "스마트스토어": 0.96, "이모야킨지로": 0 },
    crossLogistics: ["오포물류", "유비엘"],
    zeroCostChannels: ["이모야킨지로"],   // 위탁 운영수수료 채널 — 원가 미발생
  },
  settlementNote: "이다슬 규칙서 반영 — 특수 5종 N=M×배율(원룸만들기·현대홈쇼핑(3)은 rawN×배율) · 일반채널 N=rawN · 배송비 G=F/1.1(스마트스토어×0.96·이모야킨지로 0) · 원가측 R=P×Q/1.1(이모야킨지로 R=0)·S·T(2%)·U(20%, V 미포함 표시만) · 물류처 예외(오포물류·유비엘 외 S·T·U=0) · 매출이익=AA−AB. 채널명은 현 표기 완전일치(사방넷·채널 업데이트 시 이다슬 프로 재공유 예정) · Phase2: 사방넷 API 연동 시 업로드 제거, 로직 재사용",
};

const GENERIC_PRESET: SimPreset = {
  requireInput: true,
  defaults: { revenue: 0, opex: 0, grossMargin: 0, baselineProfitRate: 0 },
  fixedTargets: null,
  relativeOffsets: { conservative: 2, moderate: 4, aggressive: 6 },
  terms: { drop: "정리(단종 후보)", star: "주력 상품" },
  baseValueLabel: "기준값 입력 — 내 스토어 숫자로 체험해보세요",
  scenarioConclusion: "보수는 운영 개선만으로 닿는 선 · 공격은 공급가 협상 등 구조 개선까지 성공했을 때",
  dropBlockText: (n) => `${n}개를 한 번에 정리하지 않습니다 — 롱테일 매출이 20~40% 감소할 수 있어 단계적 정리를 권장합니다`,
  demoDrop: [],
  demoStar: [],
  settlementMultipliers: {},
  settlementNote: "VAT 제외(÷1.1) 후 채널 수수료(S+T) 반영 · Phase2: 사방넷 API 연동 시 업로드 단계 제거, 계산 로직 재사용",
};

const fmt = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString()}만`;
  return `${sign}${abs.toLocaleString()}원`;
};

export default function ProfitSimulatorTab() {
  // ── 프리셋 로드 (store 판별) ───────────────────────────────────────────────
  const [preset, setPreset] = useState<SimPreset | null>(null);

  const [scenario, setScenario] = useState<Scenario>("conservative");
  const [achievement, setAchievement] = useState(100);
  const [baseRevenue, setBaseRevenue] = useState(0);
  const [opex, setOpex] = useState(0);
  const [baseGrossMargin, setBaseGrossMargin] = useState(0);
  const [baselineProfitRate, setBaselineProfitRate] = useState(0);
  // 시나리오 목표율 (generic: 현재+offset, 사용자 수정 가능 / izStory: 고정)
  const [targetRates, setTargetRates] = useState<Record<Scenario, number>>({ conservative: 4, moderate: 6.5, aggressive: 7 });
  const [products, setProducts] = useState<Product[]>([]);
  const [dropMode, setDropMode] = useState(false);
  const [showInputs, setShowInputs] = useState(false);

  // ② 정산/매출집계
  const [showSettlement, setShowSettlement] = useState(false);
  const [uploadedRows, setUploadedRows] = useState<Record<string, unknown>[]>([]);
  const [uploadCols, setUploadCols] = useState<string[]>([]);
  const [colChannel, setColChannel] = useState("");
  const [colSaleAmt, setColSaleAmt] = useState("");   // M 판매가(VAT포함)
  const [colCostAmt, setColCostAmt] = useState("");   // P 원가 단가(VAT포함)
  const [colSupplyAmt, setColSupplyAmt] = useState(""); // N 공급가(선택 — 미선택 시 판매가로 폴백)
  const [colShipping, setColShipping] = useState("");   // F 배송비 수집(선택 — 미선택 시 G=0)
  const [colQty, setColQty] = useState("");             // Q 수량 EA(선택 — 미선택 시 1)
  const [colLogistics, setColLogistics] = useState(""); // Y 물류처(선택 — 미선택 시 물류처 예외 미적용)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ③ 채널별 광고 집계
  const [showAdBoard, setShowAdBoard] = useState(false);
  const [adRows, setAdRows] = useState([{ channel: "", adCost: "", roas: "" }]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        const isIz = d?.user?.storeId === IZ_STORE_ID;
        const pr = isIz ? IZ_PRESET : GENERIC_PRESET;
        setPreset(pr);
        setBaseRevenue(pr.defaults.revenue);
        setOpex(pr.defaults.opex);
        setBaseGrossMargin(pr.defaults.grossMargin);
        setBaselineProfitRate(pr.defaults.baselineProfitRate);
        setTargetRates(pr.fixedTargets ?? {
          conservative: pr.defaults.baselineProfitRate + pr.relativeOffsets.conservative,
          moderate: pr.defaults.baselineProfitRate + pr.relativeOffsets.moderate,
          aggressive: pr.defaults.baselineProfitRate + pr.relativeOffsets.aggressive,
        });
        setShowInputs(pr.requireInput); // generic은 기준값 패널 기본 펼침
      })
      .catch(() => { setPreset(GENERIC_PRESET); setShowInputs(true); });
  }, []);

  useEffect(() => {
    const storeId = localStorage.getItem("sellfit_store_id");
    fetch(`/api/products${storeId ? `?store_id=${storeId}` : ""}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {});
  }, []);

  const sc = SCENARIOS[scenario];
  const T = preset?.terms ?? { drop: "드롭", star: "효자" };

  // generic 상대공식: 현재 영업이익률 바뀌면 목표율 재계산 (fixedTargets 없을 때만)
  useEffect(() => {
    if (preset && !preset.fixedTargets) {
      setTargetRates({
        conservative: baselineProfitRate + preset.relativeOffsets.conservative,
        moderate: baselineProfitRate + preset.relativeOffsets.moderate,
        aggressive: baselineProfitRate + preset.relativeOffsets.aggressive,
      });
    }
  }, [baselineProfitRate, preset]);

  // ── Diagnose quadrant classification ──────────────────────────────────────
  const starProducts = useMemo(() => products.filter(p => (p.matrix_x ?? 0) >= 50 && (p.matrix_y ?? 0) >= 50), [products]);
  const dropProducts = useMemo(() => products.filter(p => (p.matrix_x ?? 100) < 50 && (p.matrix_y ?? 100) < 50), [products]);
  const totalCount = products.length || (preset === IZ_PRESET ? 140 : 0);
  const starCount  = starProducts.length  || (preset === IZ_PRESET ? 24 : 0);
  const dropCount  = dropProducts.length  || (preset === IZ_PRESET ? 73 : 0);
  const seasonCount = Math.max(0, totalCount - starCount - dropCount);

  // 입력 게이팅 (generic: 필수 4값 입력 전 비활성)
  const hasInput = !preset?.requireInput || (baseRevenue > 0 && opex > 0 && baseGrossMargin > 0 && baselineProfitRate > 0);

  // ── FORMULA ───────────────────────────────────────────────────────────────
  const newRevenue = baseRevenue;
  const dropModeFactor = dropMode ? 0.3 : 1.0;
  const effectiveFactor = (achievement / 100) * dropModeFactor;

  const baselineProfit = baseRevenue * (baselineProfitRate / 100);
  const targetProfit   = baseRevenue * ((targetRates[scenario] ?? 0) / 100);
  const operatingProfit = baselineProfit + (targetProfit - baselineProfit) * effectiveFactor;
  const profitRate = newRevenue > 0 ? (operatingProfit / newRevenue) * 100 : 0;

  const opexSavings = opex * (sc.dropSavingPct / 100) * effectiveFactor;
  const improvedGrossMargin = Math.round((baseGrossMargin + sc.marginImprovementPt * effectiveFactor) * 10) / 10;

  // ── 현금흐름 (정산지연 45일 반영) ─────────────────────────────────────────
  const monthlyProfit  = operatingProfit / 12;
  const monthlyRevenue = newRevenue / 12;
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

  if (!preset) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>불러오는 중…</div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* ── LEFT: Sidebar ── */}
      <div className="mb-6 lg:mb-0" style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed", position: "sticky", top: "60px", alignSelf: "start" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>OPTIMIZE</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>그래서 얼마 남나?</p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>비용 절감 → 이익 극대화</p>
        {["영업이익률 계기판", "월별 현금흐름", `${T.drop} 테스트 모드`].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", color: "#c0c4cc", flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: "13px", color: "#8f9399" }}>{f}</span>
          </div>
        ))}

        {/* Diagnose 연동 */}
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>Diagnose 연동</p>
          {[
            { label: T.star, count: starCount, color: PINK.main },
            { label: `${T.drop} 후보`, count: dropCount, color: "#6b7280" },
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

        {/* 입력 게이팅 안내 (generic 미입력 시) */}
        {!hasInput && (
          <div style={{ ...CARD, padding: "28px 24px", textAlign: "center", background: PINK.light, border: `1px solid ${PINK.mid}` }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: PINK.text, margin: "0 0 6px" }}>기준값을 입력하면 시뮬레이션이 시작됩니다</p>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, lineHeight: 1.7 }}>
              아래 <b>기준값 입력</b>에서 연매출·운영비·매출총이익률·현재 영업이익률을 넣으면<br />
              계기판과 현금흐름 차트가 내 스토어 숫자로 계산됩니다.
            </p>
          </div>
        )}

        {hasInput && <>
        {/* ══ BLOCK 1: 두 계기판 ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* 계기판 1: 영업이익률 */}
          <div style={{ ...CARD, padding: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "2px" }}>영업이익률</p>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>장기 체질 — 먼저 살고, 그 다음 남긴다</p>

            <div style={{ position: "relative", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: sc.color, lineHeight: 1 }}>{profitRate.toFixed(1)}</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: sc.color }}>%</span>
                <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "4px" }}>vs 현재 {baselineProfitRate}%</span>
              </div>
              <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "4px" }}>
                <div style={{ height: "100%", width: `${Math.min((profitRate / 12) * 100, 100)}%`, background: sc.color, borderRadius: "3px", transition: "width 0.5s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9px", color: "#c0c4cc" }}>0%</span>
                <span style={{ fontSize: "9px", color: "#c0c4cc" }}>업계 평균 3~8%</span>
                <span style={{ fontSize: "9px", color: "#c0c4cc" }}>12%</span>
              </div>
            </div>

            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "7px" }}>
              {[
                { label: "연 영업이익", value: fmt(operatingProfit), color: "#1a1a1a" },
                { label: `${T.drop} 절감 운반비`, value: `+${fmt(opexSavings)}`, color: sc.color },
                { label: "마진율 개선", value: `${baseGrossMargin}% → ${improvedGrossMargin}%`, color: sc.color },
                { label: `신 매출 (${T.drop} 후)`, value: fmt(newRevenue), color: "#6b7280" },
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

            <div style={{ background: positiveTurnIdx >= 0 ? "#f0fdf4" : "#fff7ed", border: `1px solid ${positiveTurnIdx >= 0 ? "#bbf7d0" : "#fed7aa"}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "13px", fontWeight: 800, color: positiveTurnIdx >= 0 ? "#15803d" : "#c2410c", marginBottom: "2px" }}>
                {positiveTurnIdx >= 0 ? `${positiveTurnLabel} 현금 플러스 전환` : "12월 이후 전환"}
              </p>
              <p style={{ fontSize: "10px", color: "#6b7280" }}>
                {positiveTurnIdx >= 0 ? `시작 후 ${positiveTurnIdx + 1}개월 — 보수 기준` : "공격 시나리오 검토 권장"}
              </p>
            </div>

            <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: "visible", display: "block" }}>
              <line x1="18" y1={midY} x2={chartW - 18} y2={midY} stroke="#e8eaed" strokeWidth="1" strokeDasharray="4,3" />
              {positiveTurnIdx >= 0 && (() => {
                const pts = cashFlowMonths.slice(positiveTurnIdx).map((v, i) => toXY(v, i + positiveTurnIdx));
                const x0 = pts[0].x; const xN = pts[pts.length - 1].x;
                const polyPts = [...pts.map(p => `${p.x},${p.y}`), `${xN},${midY}`, `${x0},${midY}`].join(" ");
                return <polygon points={polyPts} fill={sc.color} fillOpacity="0.08" />;
              })()}
              <polyline points={svgPoints} fill="none" stroke={sc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75 }}>{preset.scenarioConclusion}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            {(Object.entries(SCENARIOS) as [Scenario, ScenarioConfig][]).map(([key, s]) => {
              const active = scenario === key;
              return (
                <button key={key} onClick={() => setScenario(key)}
                  style={{ padding: "14px 8px", borderRadius: "10px", border: `2px solid ${active ? s.color : "#e8eaed"}`, background: active ? `${s.color}12` : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", textAlign: "center" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: active ? s.color : "#6b7280", marginBottom: "4px" }}>{s.label}</p>
                  {/* generic: 목표율 직접 수정 가능 / izStory: 고정 표시 */}
                  {preset.fixedTargets ? (
                    <p style={{ fontSize: "20px", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: "4px" }}>{targetRates[key]}%</p>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "1px", marginBottom: "4px" }} onClick={e => e.stopPropagation()}>
                      <input type="number" step="0.5" value={targetRates[key]}
                        onChange={e => setTargetRates(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        style={{ width: "44px", fontSize: "20px", fontWeight: 900, color: s.color, lineHeight: 1, border: "none", borderBottom: `1px dashed ${s.color}66`, background: "transparent", textAlign: "right", outline: "none", fontFamily: "inherit", padding: 0 }} />
                      <span style={{ fontSize: "18px", fontWeight: 900, color: s.color }}>%</span>
                    </div>
                  )}
                  <p style={{ fontSize: "11px", color: "#9ca3af" }}>영업이익률 목표</p>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#9ca3af" }}>
                    <span>{T.drop}절감 {s.dropSavingPct}% · 마진 +{s.marginImprovementPt}%p</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>달성률 민감도 슬라이더</p>
              <span style={{ fontSize: "14px", fontWeight: 800, color: sc.color }}>{achievement}%</span>
            </div>
            <input type="range" min={0} max={150} step={5} value={achievement}
              onChange={e => setAchievement(Number(e.target.value))}
              style={{ width: "100%", accentColor: sc.color, cursor: "pointer" }} />
            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.75, marginTop: "4px" }}>
              유사 셀러 벤치 기반 추정 · 실판매 데이터 1~2개월 입력 시 자동 교정
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {[
              { label: `${T.drop} 절감 (판관비)`, value: fmt(opexSavings), sub: `${fmt(opex)}의 ${sc.dropSavingPct}%` },
              { label: "개선 매출총이익률", value: `${improvedGrossMargin}%`, sub: `${baseGrossMargin}% → ${improvedGrossMargin}%p` },
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

          <div style={{ ...CARD, padding: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px" }}>Quick Win 액션</p>

            <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>{T.drop} 후보 Top 5 <span style={{ fontSize: "11px", fontWeight: 400, color: "#9ca3af" }}>— 테스트 모드로 안전하게</span></p>
            {(dropProducts.length > 0 ? dropProducts : preset.demoDrop).slice(0, 5).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < 4 ? "1px solid #f3f4f6" : "none" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", width: "14px", flexShrink: 0 }}>{i + 1}</span>
                <p style={{ fontSize: "14px", color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <span style={{ fontSize: "11px", background: "#f3f4f6", borderRadius: "4px", padding: "1px 6px", color: "#6b7280", flexShrink: 0 }}>
                  수요{p.matrix_x ?? 0} 마진{p.matrix_y ?? 0}
                </span>
              </div>
            ))}
            {dropProducts.length === 0 && preset.demoDrop.length === 0 && (
              <p style={{ fontSize: "12px", color: "#c0c4cc", padding: "6px 0" }}>Diagnose에서 저성과 상품이 분류되면 여기에 표시됩니다.</p>
            )}

            <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "14px", paddingTop: "14px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>{T.star} Top 3 집중 <span style={{ fontSize: "11px", fontWeight: 400, color: "#9ca3af" }}>— 광고 예산 집중</span></p>
              {(starProducts.length > 0 ? starProducts : preset.demoStar).slice(0, 3).map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: "13px", color: PINK.main, width: "14px", flexShrink: 0 }}>★</span>
                  <p style={{ fontSize: "14px", color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <span style={{ fontSize: "11px", background: PINK.light, borderRadius: "4px", padding: "1px 6px", color: PINK.text, flexShrink: 0 }}>마진{p.matrix_y ?? 0}</span>
                </div>
              ))}
              {starProducts.length === 0 && preset.demoStar.length === 0 && (
                <p style={{ fontSize: "12px", color: "#c0c4cc", padding: "6px 0" }}>고성과 주력 상품이 분류되면 여기에 표시됩니다.</p>
              )}
            </div>
          </div>

          <div style={{ ...CARD, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>{T.drop} 테스트 모드</p>
              <button onClick={() => setDropMode(!dropMode)}
                style={{ fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", border: "none", cursor: "pointer", background: dropMode ? PINK.main : "#f3f4f6", color: dropMode ? "#fff" : "#6b7280", fontFamily: "inherit", transition: "all 0.2s" }}>
                {dropMode ? "ON · 관찰 중" : "OFF"}
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>
              {preset.dropBlockText(dropCount)}
            </p>

            {[
              { step: "1", label: "관찰 시작", desc: `${T.drop} 후보를 '관찰' 표시 — 판매는 계속`, color: "#6b7280", bg: "#f9fafb", border: "#e8eaed" },
              { step: "2", label: "1개월 모니터링", desc: `${T.star}·번들 매출 영향 데이터 확인`, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
              { step: "3", label: `${T.drop} 결정`, desc: `타격 없으면 ${T.drop} · 있으면 롱테일 → 유지`, color: PINK.main, bg: PINK.light, border: PINK.mid },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: "10px", marginBottom: "10px", padding: "10px", borderRadius: "8px", background: s.bg, border: `1px solid ${s.border}` }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: s.color, color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px" }}>{s.label}</p>
                  <p style={{ fontSize: "10px", color: "#6b7280" }}>{s.desc}</p>
                </div>
              </div>
            ))}

            <div style={{ background: "#fff9f0", border: "1px solid #fed7aa", borderRadius: "6px", padding: "8px 12px", marginTop: "4px" }}>
              <p style={{ fontSize: "10px", color: "#c2410c", fontWeight: 700 }}>⚠️ 정직 표시</p>
              <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px", lineHeight: 1.6 }}>
                {T.drop} 효과는 가정값 · 실판매 1~2개월로 교정 · 단정하지 않습니다
              </p>
            </div>
          </div>
        </div>
        </>}

        {/* ══ 기준값 패널 ══ */}
        <div style={{ ...CARD }}>
          <button onClick={() => setShowInputs(!showInputs)}
            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>{preset.baseValueLabel}</span>
            <span style={{ fontSize: "11px", color: "#9ca3af", transform: showInputs ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>
          {showInputs && (
            <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: preset.requireInput ? "1fr 1fr" : "1fr 1fr 1fr", gap: "12px", borderTop: "1px solid #f3f4f6" }}>
              {[
                { label: "연 매출 (원)", value: baseRevenue, set: setBaseRevenue, ph: "예) 500,000,000" },
                { label: "판관비 (원)", value: opex, set: setOpex, ph: "예) 250,000,000" },
                { label: "기준 매출총이익률 (%)", value: baseGrossMargin, set: setBaseGrossMargin, ph: "예) 45" },
                // 현재 영업이익률: generic만 입력 필드 노출 (izStory는 1.5 고정)
                ...(preset.requireInput ? [{ label: "현재 영업이익률 (%)", value: baselineProfitRate, set: setBaselineProfitRate, ph: "예) 2.0" }] : []),
              ].map(f => (
                <div key={f.label} style={{ paddingTop: "14px" }}>
                  <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
                  <input type="number" value={f.value || ""} placeholder={f.ph}
                    onChange={e => f.set(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", background: "#f9fafb", fontSize: "13px", color: "#1a1a1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ BLOCK 4: 정산/매출집계 ══ */}
        <div style={{ ...CARD }}>
          <button onClick={() => setShowSettlement(!showSettlement)}
            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = evt => {
                      const buf = evt.target?.result;
                      const wb = XLSX.read(buf, { type: "array" });
                      const ws = wb.Sheets[wb.SheetNames[0]];
                      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
                      setUploadedRows(rows);
                      setUploadCols(rows.length > 0 ? Object.keys(rows[0]) : []);
                      setColChannel(""); setColSaleAmt(""); setColCostAmt("");
                      setColSupplyAmt(""); setColShipping(""); setColQty(""); setColLogistics("");
                    };
                    reader.readAsArrayBuffer(file);
                  }} />
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #e8eaed", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  엑셀 파일 선택
                </button>
                {uploadedRows.length > 0 && (
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{uploadedRows.length}건 로드됨 · {uploadCols.length}개 컬럼</span>
                )}
              </div>

              {uploadCols.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "채널명 컬럼", value: colChannel, set: setColChannel, req: true },
                    { label: "판매가 M 컬럼 (VAT포함)", value: colSaleAmt, set: setColSaleAmt, req: true },
                    { label: "원가 P 컬럼 (VAT포함)", value: colCostAmt, set: setColCostAmt, req: true },
                    { label: "공급가 N 컬럼 (선택·미선택시 판매가)", value: colSupplyAmt, set: setColSupplyAmt, req: false },
                    { label: "배송비수집 F 컬럼 (선택·미선택시 0)", value: colShipping, set: setColShipping, req: false },
                    { label: "수량 EA·Q 컬럼 (선택·미선택시 1)", value: colQty, set: setColQty, req: false },
                    { label: "물류처 Y 컬럼 (선택·미선택시 예외미적용)", value: colLogistics, set: setColLogistics, req: false },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: "10px", color: f.req ? "#6b7280" : "#9ca3af", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {f.req && <span style={{ color: "#ef567c" }}>* </span>}{f.label}
                      </label>
                      <select value={f.value} onChange={e => f.set(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", background: "#fff", fontSize: "12px", color: "#374151", fontFamily: "inherit", cursor: "pointer" }}>
                        <option value="">— 선택 —</option>
                        {uploadCols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {colChannel && colSaleAmt && colCostAmt && uploadedRows.length > 0 && (() => {
                // 이다슬 규칙서 (2026-07-15 확정) 기호 그대로:
                //   매출측 N_calc(특수5종 M×배율·원룸 rawN×0.85·일반 rawN) → O=N_calc/1.1
                //          G=F/1.1(스마트스토어×0.96·이모야 0) → AA=G+O
                //   원가측 R=P×Q/1.1 · S=T=R×0.02 · U=R×0.2 · V=R+S+T(U 미포함) → AB=V
                //   물류처 예외: Y가 오포물류·유비엘 아니면 S·T·U=0
                //   매출이익=AA−AB · 매출이익률=(AA−AB)/AA
                //   ※ 최종이익 아님 — 광고비·배송비 제외 전 (이다슬 프로 별도 반영, 2026-07-16 확정)
                const MULT = preset.settlementMultipliers;
                const RULES = preset.settlementRules;
                type Agg = { count: number; O: number; G: number; AA: number; R: number; S: number; T: number; U: number; AB: number };
                const grouped: Record<string, Agg> = {};
                for (const row of uploadedRows) {
                  const ch = String(row[colChannel] ?? "기타").trim();
                  const M = Number(row[colSaleAmt]) || 0;
                  const Nraw = colSupplyAmt ? (Number(row[colSupplyAmt]) || 0) : M;   // 폴백: 판매가
                  const P = Number(row[colCostAmt]) || 0;
                  const Q = colQty ? (Number(row[colQty]) || 0) : 1;                  // 폴백: 1
                  const F = colShipping ? (Number(row[colShipping]) || 0) : 0;        // 폴백: 0
                  const Y = colLogistics ? String(row[colLogistics] ?? "").trim() : "";
                  const mult = MULT[ch];                                              // 특수 5종만 존재
                  // 매출측
                  let Ncalc: number;
                  if (RULES?.swapMNChannels.includes(ch)) Ncalc = Nraw * (mult ?? 1); // 원룸: rawN×배율
                  else if (mult != null) Ncalc = M * mult;                            // 특수 나머지 4종
                  else Ncalc = Nraw;                                                  // 일반/그 외
                  const O = Ncalc / 1.1;
                  let G = F / 1.1;
                  const shipMult = RULES?.shippingMultipliers[ch];
                  if (shipMult != null) G *= shipMult;                                // 스마트스토어 0.96·이모야 0
                  const AA = G + O;
                  // 원가측 — 이모야킨지로 등 위탁 운영수수료 채널은 R=0 (2026-07-16 이다슬 확정)
                  const R = RULES?.zeroCostChannels.includes(ch) ? 0 : (P * Q) / 1.1;
                  let S = R * 0.02, T = R * 0.02, U = R * 0.2;
                  if (RULES && colLogistics && !RULES.crossLogistics.includes(Y)) { S = 0; T = 0; U = 0; }
                  const AB = R + S + T;                                               // V=R+S+T (U 미포함), AB=V
                  const g = grouped[ch] ?? (grouped[ch] = { count: 0, O: 0, G: 0, AA: 0, R: 0, S: 0, T: 0, U: 0, AB: 0 });
                  g.count++; g.O += O; g.G += G; g.AA += AA; g.R += R; g.S += S; g.T += T; g.U += U; g.AB += AB;
                }
                const rows = Object.entries(grouped).map(([ch, g]) => {
                  const marginAmt = g.AA - g.AB;
                  const marginPct = g.AA > 0 ? (marginAmt / g.AA) * 100 : 0;
                  return { ch, ...g, marginAmt, marginPct, mult: MULT[ch] };
                }).sort((a, b) => b.AA - a.AA);
                const TOT = {
                  count: rows.reduce((s, r) => s + r.count, 0),
                  AA: rows.reduce((s, r) => s + r.AA, 0),
                  AB: rows.reduce((s, r) => s + r.AB, 0),
                  U: rows.reduce((s, r) => s + r.U, 0),
                };
                const totMarginAmt = TOT.AA - TOT.AB;
                const totMarginPct = TOT.AA > 0 ? (totMarginAmt / TOT.AA) * 100 : 0;
                const won = (n: number) => Math.round(n).toLocaleString() + "원";
                const missing = [!colSupplyAmt && "공급가N", !colShipping && "배송비F", !colQty && "수량Q", !colLogistics && "물류처Y"].filter(Boolean);
                return (
                  <div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>채널별 매출이익 보드 · 총 {uploadedRows.length}건 (AA 상품매출 / AB 상품총원가 / U 물류비)</div>
                    <div style={{ fontSize: "11px", color: "#c2410c", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "7px 10px", marginBottom: "10px", lineHeight: 1.6 }}>
                      ※ 여기 표시되는 값은 <b>매출이익</b>(AA−AB)입니다. <b>최종이익이 아닙니다</b> — 광고비·배송비는 제외 전이며, 이다슬 프로가 광고비 시스템에서 직접 확인해 별도 반영합니다. (2026-07-16 확정)
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e8eaed" }}>
                            {["채널", "건수", "AA 상품매출", "AB 상품총원가", "U 물류비", "매출이익", "매출이익률"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: "10px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.ch} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "9px 10px", fontWeight: 600, color: "#0f2a1e", whiteSpace: "nowrap" }}>
                                {r.ch}{r.mult != null && <span style={{ marginLeft: 5, fontSize: 10, color: "#f59e0b" }}>×{r.mult}</span>}
                              </td>
                              <td style={{ padding: "9px 10px", color: "#6b7280" }}>{r.count}</td>
                              <td style={{ padding: "9px 10px", color: "#374151" }}>{won(r.AA)}</td>
                              <td style={{ padding: "9px 10px", color: "#374151" }}>{won(r.AB)}</td>
                              <td style={{ padding: "9px 10px", color: "#6b7280" }}>{won(r.U)}</td>
                              <td style={{ padding: "9px 10px", color: r.marginAmt >= 0 ? "#374151" : "#dc2626" }}>{won(r.marginAmt)}</td>
                              <td style={{ padding: "9px 10px", fontWeight: 700, color: r.marginPct >= 20 ? "#15803d" : r.marginPct >= 10 ? "#d97706" : "#dc2626" }}>{r.marginPct.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: "2px solid #e8eaed" }}>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151", fontSize: "11px" }}>합계</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{TOT.count}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{won(TOT.AA)}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "#374151" }}>{won(TOT.AB)}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "#6b7280" }}>{won(TOT.U)}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: totMarginAmt >= 0 ? "#374151" : "#dc2626" }}>{won(totMarginAmt)}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: totMarginPct >= 20 ? "#15803d" : totMarginPct >= 10 ? "#d97706" : "#dc2626" }}>{totMarginPct.toFixed(1)}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {missing.length > 0 && (
                      <p style={{ fontSize: "10px", color: "#d97706", marginTop: "8px", lineHeight: 1.6 }}>
                        ⚠ 미선택 컬럼: {missing.join("·")} — 각각 {[!colSupplyAmt && "공급가=판매가", !colShipping && "배송비=0", !colQty && "수량=1", !colLogistics && "물류처 예외 미적용(S·T·U 전부 적용)"].filter(Boolean).join(" / ")} 으로 계산됨
                      </p>
                    )}
                    <p style={{ fontSize: "10px", color: "#c0c4cc", marginTop: "10px", lineHeight: 1.6 }}>
                      {preset.settlementNote}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ══ BLOCK 5: 채널별 광고 집계 ══ */}
        <div style={{ ...CARD }}>
          <button onClick={() => setShowAdBoard(!showAdBoard)}
            style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>채널별 광고 집계</span>
              <span style={{ fontSize: "10px", background: "#ede9fe", color: "#6d28d9", padding: "1px 7px", borderRadius: "9px", fontWeight: 600 }}>수동입력</span>
            </div>
            <span style={{ fontSize: "11px", color: "#9ca3af", transform: showAdBoard ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>

          {showAdBoard && (
            <div style={{ padding: "0 20px 24px", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "14px", marginBottom: "16px", lineHeight: 1.6 }}>
                ※ 채널별 주간 광고비·ROAS를 입력하면 추정 매출을 집계합니다
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
                {["채널명", "주간 광고비 (원)", "ROAS", ""].map(h => (
                  <div key={h} style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", padding: "0 4px" }}>{h}</div>
                ))}
              </div>
              {adRows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="예) 스마트스토어" value={row.channel}
                    onChange={e => setAdRows(prev => prev.map((r, j) => j === i ? { ...r, channel: e.target.value } : r))}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", fontSize: "12px", fontFamily: "inherit", outline: "none" }} />
                  <input type="number" placeholder="예) 150000" value={row.adCost}
                    onChange={e => setAdRows(prev => prev.map((r, j) => j === i ? { ...r, adCost: e.target.value } : r))}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", fontSize: "12px", fontFamily: "inherit", outline: "none" }} />
                  <input type="number" placeholder="예) 3.2" value={row.roas}
                    onChange={e => setAdRows(prev => prev.map((r, j) => j === i ? { ...r, roas: e.target.value } : r))}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e8eaed", fontSize: "12px", fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => setAdRows(prev => prev.filter((_, j) => j !== i))}
                    style={{ padding: "8px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "14px" }}>×</button>
                </div>
              ))}
              <button onClick={() => setAdRows(prev => [...prev, { channel: "", adCost: "", roas: "" }])}
                style={{ fontSize: "12px", color: "#6b7280", background: "none", border: "1px dashed #e8eaed", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", marginBottom: "16px" }}>
                + 채널 추가
              </button>

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
