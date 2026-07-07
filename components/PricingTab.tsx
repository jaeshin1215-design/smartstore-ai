"use client";

import { useState, useRef, useEffect } from "react";
import PolicyFilter from "@/components/PolicyFilter";
import { useStream } from "@/lib/useStream";

interface PricingResult {
  action_command?: string;
  recommended_price: number;
  min_price: number;
  max_price: number;
  margin_rate: number;
  price_breakdown?: { cost: number; profit: number; margin_per_unit: number };
  strategy: string;
  tips: string[];
}

const CARD: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  border: "1px solid #e8eaed",
};
const inputCls = "w-full text-sm rounded-lg px-4 py-3 outline-none transition-all placeholder:text-gray-400 text-[#1a1a1a]";
const inputStyle: React.CSSProperties = { background: "#f9fafb", border: "1px solid #e8eaed" };
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const labelStyle: React.CSSProperties = { color: "#9ca3af" };

function SkeletonResult() {
  return (
    <div className="mt-5 space-y-3 animate-pulse">
      <div className="h-14 rounded-xl" style={{ background: "#f7f8fa" }} />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: "#f7f8fa" }} />)}
      </div>
      <div className="h-16 rounded-xl" style={{ background: "#f7f8fa" }} />
      <div className="h-20 rounded-xl" style={{ background: "#f7f8fa" }} />
      {[0, 1, 2].map(i => <div key={i} className="h-10 rounded-xl" style={{ background: "#f7f8fa" }} />)}
    </div>
  );
}

function MarginBar({ rate }: { rate: number }) {
  const clamped = Math.min(Math.max(rate, 0), 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: "#9ca3af" }}>마진율</span>
        <span className="font-bold" style={{ color: "#1a1a1a" }}>{rate}%</span>
      </div>
      <div className="h-2.5 rounded-full" style={{ background: "#e8eaed" }}>
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, background: "#9ca3af" }} />
      </div>
    </div>
  );
}

// 샘플 결과 (최초 진입 시 fallback — 아로니아 분말 기본값 기준)
const SAMPLE_RESULT: PricingResult = {
  action_command: "17,500원으로 설정 후 주 단위 전환율 추적 권장",
  recommended_price: 17500,
  min_price: 14900,
  max_price: 19900,
  margin_rate: 32,
  price_breakdown: { cost: 11900, profit: 5600, margin_per_unit: 5600 },
  strategy: "매입가 8,000원 기준 총 원가 11,900원. 경쟁가 15,000원 대비 소폭 상향한 17,500원이 마진·전환 균형점. 시즌 피크 시 19,900원 테스트 가능.",
  tips: [
    "경쟁가 모니터링 — 15,000원 이하 진입 시 즉시 14,900원으로 대응",
    "묶음 구성(2개) 시 추가 20% 마진 확보 가능",
    "네이버쇼핑 광고 CPC 350원 내외 목표 (17,500원 기준)",
  ],
};

// Dynamic Pricing 토글 mock 값 (가격 후보별 예상 성과)
const DYN_ROWS = [
  { label: "최소가", convPct: 75, marginPct: 22, convLabel: "높음", marginLabel: "낮음" },
  { label: "추천가", convPct: 52, marginPct: 68, convLabel: "중간", marginLabel: "높음",  ai: true },
  { label: "최대가", convPct: 14, marginPct: 94, convLabel: "낮음", marginLabel: "매우 높음" },
];

const GRADE_OPTIONS = [
  { value: "micro",  label: "영세 (3억 미만)",  rate: 1.98 },
  { value: "small1", label: "중소1 (3~5억)",    rate: 2.585 },
  { value: "small2", label: "중소2 (5~10억)",   rate: 2.75 },
  { value: "small3", label: "중소3 (10~30억)",  rate: 3.025 },
  { value: "normal", label: "일반 (30억+)",      rate: 3.63 },
];

const TRAFFIC_OPTIONS = [
  { value: "naver_shopping", label: "네이버 쇼핑 유입", rate: 2.73 },
  { value: "external",       label: "외부 마케팅",      rate: 0.91 },
];

export default function PricingTab() {
  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [shippingCost, setShippingCost] = useState("3000");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [salesGrade, setSalesGrade] = useState("small3");
  const [trafficSource, setTrafficSource] = useState("naver_shopping");
  const [feeMode, setFeeMode] = useState<"auto" | "manual">("auto");
  const [customFeeRate, setCustomFeeRate] = useState("");
  const [result, setResult] = useState<PricingResult | null>(SAMPLE_RESULT);
  const [isSample, setIsSample] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [showDynamic, setShowDynamic] = useState(true);
  const [dynData, setDynData] = useState<{ comp: number | null; stock: number | null } | null>(null);
  const { streaming, readStream } = useStream();
  const submitting = useRef(false);

  useEffect(() => {
    const sid = typeof window !== "undefined" ? localStorage.getItem("sellfit_store_id") : null;
    if (sid) setStoreId(sid);
  }, []);

  useEffect(() => {
    if (!showDynamic || !storeId) return;
    Promise.allSettled([
      fetch(`/api/competitor-tracking?store_id=${storeId}`).then(r => r.json()),
      fetch(`/api/products?store_id=${storeId}`).then(r => r.json()),
    ]).then(([compRes, prodRes]) => {
      const records = compRes.status === "fulfilled" ? (compRes.value.records ?? []) : [];
      const products = prodRes.status === "fulfilled" ? (prodRes.value.products ?? []) : [];
      const nameKey = productName.slice(0, 4);
      const compMatch = records.find((r: Record<string, unknown>) =>
        String(r.product_name ?? "").includes(nameKey)
      );
      const prodMatch = products.find((p: Record<string, unknown>) =>
        String(p.name ?? "").includes(nameKey)
      );
      setDynData({
        comp: compMatch ? Number(compMatch.coupang_price) : null,
        stock: prodMatch != null ? Number(prodMatch.stock) : null,
      });
    }).catch(() => setDynData({ comp: null, stock: null }));
  }, [showDynamic, storeId, productName]);

  const gradeRate = GRADE_OPTIONS.find(g => g.value === salesGrade)?.rate ?? 3.025;
  const trafficRate = TRAFFIC_OPTIONS.find(t => t.value === trafficSource)?.rate ?? 2.73;
  const autoFeeRate = gradeRate + trafficRate;
  const effectiveFeeRate = feeMode === "manual" && customFeeRate ? Number(customFeeRate) : autoFeeRate;

  const platformFee = purchasePrice ? Math.round(Number(purchasePrice) * effectiveFeeRate / 100) : 0;
  const totalCost = purchasePrice ? Number(purchasePrice) + Number(shippingCost || 3000) + platformFee : 0;

  const handleSubmit = async () => {
    if (!productName || !purchasePrice || submitting.current) return;
    submitting.current = true;
    setLoading(true); setResult(null); setIsSample(false); setError("");

    // 서버와 동일한 수식으로 숫자 먼저 확정 — LLM 응답값은 strategy·tips·action_command만 사용
    const calcMargin = targetMargin ? Number(targetMargin) : 32;
    const calcRecommended = Math.round(totalCost / (1 - calcMargin / 100));
    const calcMinByMargin = Math.round(totalCost / (1 - 0.15));
    const calcCompetitor = competitorPrice ? Number(competitorPrice) : null;
    const calcMin = calcCompetitor
      ? Math.max(totalCost + 500, Math.min(calcMinByMargin, Math.round(calcCompetitor * 0.95)))
      : calcMinByMargin;
    const calcMax = Math.round(totalCost / (1 - 0.45));
    const calcMarginRate = Math.round(((calcRecommended - totalCost) / calcRecommended) * 100);
    const calcProfit = calcRecommended - totalCost;

    try {
      const res = await fetch("/api/pricing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName, purchasePrice, shippingCost, competitorPrice, targetMargin, category, features,
          salesGrade, trafficSource,
          customFeeRate: feeMode === "manual" ? customFeeRate : undefined,
        }),
      });
      let parsed = false;
      await readStream(res, (text) => {
        try {
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON");
          const p = JSON.parse(match[0]);
          parsed = true;
          setResult({
            action_command: p.action_command || "",
            // LLM 숫자값 무시 — 서버 수식 계산값으로 강제 적용
            recommended_price: calcRecommended,
            min_price: calcMin,
            max_price: calcMax,
            margin_rate: calcMarginRate,
            price_breakdown: { cost: totalCost, profit: calcProfit, margin_per_unit: calcProfit },
            strategy: p.strategy || "",
            tips: Array.isArray(p.tips) ? p.tips : [],
          });
        } catch { setError("분석 결과를 불러오지 못했습니다. 다시 시도해주세요."); }
      }, () => setError("오류가 발생했습니다. 다시 시도해주세요."));

      // 가격결정 이력 저장 — 실패해도 화면 흐름에 영향 없음
      if (parsed && storeId) {
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_id: storeId,
            event_type: "price_decision",
            product_name: productName,
            purchase_price: Number(purchasePrice),
            competitor_price: calcCompetitor,
            recommended_price: calcRecommended,
            min_price: calcMin,
            max_price: calcMax,
            margin_rate: calcMarginRate,
          }),
        }).catch(() => {});
      }
    } catch { setError("오류가 발생했습니다. 다시 시도해주세요."); }
    finally { submitting.current = false; setLoading(false); }
  };

  return (
    <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* ── LEFT: Hero sidebar ── */}
      <div className="mb-6 lg:mb-0" style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
          PRICE OPTIMIZER
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>
          얼마에 팔아야 남지?
        </p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>
          매입가 → AI 마진 전략
        </p>
        {["수수료·배송비 자동 계산", "경쟁사 가격 비교 분석", "마진율 최적화 전략"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", color: "#c0c4cc", flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: "13px", color: "#8f9399" }}>{f}</span>
          </div>
        ))}

        {/* Margin result - compact */}
        {result && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>마진 분석</p>
            <MarginBar rate={result.margin_rate} />
            {(result.price_breakdown?.margin_per_unit ?? 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <div>
                  <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px" }}>총 원가</p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a" }}>{result.price_breakdown?.cost.toLocaleString()}원</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px" }}>건당 순이익</p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a" }}>+{result.price_breakdown?.margin_per_unit.toLocaleString()}원</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Card ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: "1232px", margin: "0 auto" }}>
      <div style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>가격 분석</p>
          <h2 className="font-bold text-xl" style={{ color: "#111827" }}>최적 판매가 계산</h2>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>매입가 입력 → AI가 마진 전략 분석</p>
        </div>

        {/* Form */}
        <div className="space-y-3.5">
          <div>
            <label className={labelCls} style={labelStyle}>상품명</label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="예) 국산 유기농 아로니아 분말 500g" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>매입가 (원가) <span className="text-red-400 normal-case">*</span></label>
            <div className="relative">
              <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
                placeholder="예) 8000" className={inputCls + " pr-10"} style={inputStyle} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>원</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>배송비</label>
              <div className="relative">
                <input type="number" value={shippingCost} onChange={e => setShippingCost(e.target.value)}
                  placeholder="3000" className={inputCls + " pr-10"} style={inputStyle} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>원</span>
              </div>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>경쟁사 최저가</label>
              <div className="relative">
                <input type="number" value={competitorPrice} onChange={e => setCompetitorPrice(e.target.value)}
                  placeholder="예) 15000" className={inputCls + " pr-10"} style={inputStyle} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>원</span>
              </div>
            </div>
          </div>

          {/* 수수료 설정 */}
          <div className="rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>수수료 설정</p>
              <div className="flex rounded-lg overflow-hidden border text-[11px] font-semibold" style={{ borderColor: "#e8eaed" }}>
                <button
                  type="button"
                  onClick={() => setFeeMode("auto")}
                  className="px-3 py-1 transition-colors"
                  style={{ background: feeMode === "auto" ? "#1a1a1a" : "white", color: feeMode === "auto" ? "white" : "#6b7280" }}>
                  자동
                </button>
                <button
                  type="button"
                  onClick={() => setFeeMode("manual")}
                  className="px-3 py-1 transition-colors"
                  style={{ background: feeMode === "manual" ? "#1a1a1a" : "white", color: feeMode === "manual" ? "white" : "#6b7280" }}>
                  직접입력
                </button>
              </div>
            </div>

            {feeMode === "auto" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>매출 등급</label>
                  <select
                    value={salesGrade}
                    onChange={e => setSalesGrade(e.target.value)}
                    className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                    style={{ background: "#f7f8fa", border: "1px solid #e8eaed", color: "#1a1a1a" }}>
                    {GRADE_OPTIONS.map(g => (
                      <option key={g.value} value={g.value}>{g.label} ({g.rate}%)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>유입 경로</label>
                  <select
                    value={trafficSource}
                    onChange={e => setTrafficSource(e.target.value)}
                    className="w-full text-xs rounded-lg px-3 py-2.5 outline-none"
                    style={{ background: "#f7f8fa", border: "1px solid #e8eaed", color: "#1a1a1a" }}>
                    {TRAFFIC_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label} ({t.rate}%)</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={customFeeRate}
                  onChange={e => setCustomFeeRate(e.target.value)}
                  placeholder={`${autoFeeRate.toFixed(3).replace(/\.?0+$/, "")} (자동 계산값)`}
                  className="w-full text-sm rounded-lg px-4 py-2.5 outline-none pr-10"
                  style={{ background: "#f7f8fa", border: "1px solid #e8eaed", color: "#1a1a1a" }}
                  step="0.001" min="0" max="30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>%</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-2.5">
              <p className="text-[10px]" style={{ color: "#9ca3af" }}>
                {feeMode === "auto"
                  ? `합계 ${effectiveFeeRate.toFixed(3).replace(/\.?0+$/, "")}% · 2025-06-02 개편 반영`
                  : "정확한 수수료: 스마트스토어 정산관리 → 나의 수수료 정보"}
              </p>
            </div>
          </div>

          {/* Cost preview - mobile only */}
          {purchasePrice && (
            <div className="lg:hidden rounded-xl p-4" style={{ background: "#f7f8fa", border: "1px solid #e8eaed" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>원가 미리보기</p>
              <div className="space-y-1.5">
                {[
                  { label: "매입가", val: Number(purchasePrice) },
                  { label: "배송비", val: Number(shippingCost || 3000) },
                  { label: `수수료 ${effectiveFeeRate.toFixed(3).replace(/\.?0+$/, "")}%`, val: platformFee },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-xs" style={{ color: "#6b7280" }}>
                    <span>{r.label}</span><span>{r.val.toLocaleString()}원</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-1.5 border-t"
                  style={{ color: "#1a1a1a", borderColor: "#e8eaed" }}>
                  <span>총 원가</span><span>{totalCost.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>목표 마진율</label>
              <div className="relative">
                <input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)}
                  placeholder="예) 30" className={inputCls + " pr-8"} style={inputStyle} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>%</span>
              </div>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>카테고리</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="예) 식품 > 건강식품" className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>상품 특징</label>
            <input type="text" value={features} onChange={e => setFeatures(e.target.value)}
              placeholder="예) 유기농 인증, 프리미엄 포장, 당일 발송" className={inputCls} style={inputStyle} />
          </div>

          <button onClick={handleSubmit} disabled={loading || streaming || !productName || !purchasePrice}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: "#ef567c" }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />연결 중...
                </span>
              : "💰 최적 가격 분석하기"}
          </button>
        </div>

        {streaming && <SkeletonResult />}
        {error && !streaming && (
          <div className="mt-4 rounded-xl p-4 border" style={{ background: "#fff1f0", borderColor: "#fca5a5" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && !streaming && (
          <div className="mt-5 space-y-4">
            {/* 샘플 배너 */}
            {isSample && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-2.5 border" style={{ background: "#f8f9fa", borderColor: "#e8eaed" }}>
                <span style={{ fontSize: "14px" }}>📋</span>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: "#6b7280", margin: 0 }}>아로니아 분말 예시 화면입니다</p>
                  <p className="text-[10px]" style={{ color: "#9ca3af", margin: 0 }}>실제 상품명·매입가 입력 후 분석하면 이 결과로 교체됩니다</p>
                </div>
              </div>
            )}
            {/* Action command */}
            {result.action_command && (
              <div className="rounded-xl p-4 border-l-4" style={{ background: "#fafafa", borderColor: "#d5d8dc" }}>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "#64676b" }}>⚡ 지금 바로 실행하세요</p>
                <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>{result.action_command}</p>
              </div>
            )}

            {/* 3-column price cards */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>판매가 범위</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-3.5 text-center" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                  <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "#9ca3af" }}>최소 판매가</p>
                  <p className="font-extrabold text-base leading-none" style={{ color: "#1a1a1a" }}>
                    {result.min_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>원</p>
                </div>
                <div className="rounded-xl p-3.5 text-center" style={{ background: "#1a1a1a" }}>
                  <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>✨ 추천가</p>
                  <p className="font-extrabold text-base leading-none text-white">
                    {result.recommended_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>원</p>
                </div>
                <div className="rounded-xl p-3.5 text-center" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                  <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "#9ca3af" }}>최대 판매가</p>
                  <p className="font-extrabold text-base leading-none" style={{ color: "#1a1a1a" }}>
                    {result.max_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>원</p>
                </div>
              </div>
            </div>

            {/* ── Dynamic Pricing 토글 ── */}
            <div>
              <button
                onClick={() => setShowDynamic(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border transition-all"
                style={{ background: showDynamic ? "#f9fafb" : "white", borderColor: "#e8eaed", color: "#4b5563", fontFamily: "inherit" }}
              >
                <span>이 가격, 시간이 지나면 이렇게 자동 조정됩니다</span>
                <span style={{ transition: "transform 0.2s", transform: showDynamic ? "rotate(90deg)" : "none", display: "inline-block", marginLeft: "8px" }}>▸</span>
              </button>

              {showDynamic && (
                <div className="rounded-xl border mt-1 p-4 space-y-4" style={{ background: "#f9fafb", borderColor: "#e8eaed" }}>
                  {/* 상단 헤더 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9ca3af", margin: 0 }}>OPTIMIZE</p>
                      <p className="font-bold text-base" style={{ color: "#1a1a1a", margin: "2px 0 0" }}>Dynamic Pricing</p>
                      <p className="text-[11px]" style={{ color: "#9ca3af", margin: "2px 0 0" }}>Contextual Bandit 방식 · 셀러 10곳+가격API 5,000건 인정화 후 실제 연동</p>
                    </div>
                    <span className="text-[10px] font-semibold rounded-lg px-2.5 py-1.5 flex-shrink-0 ml-3" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                      예시 화면 · 가격데이터 축적 후 실제 학습모델로 작동
                    </span>
                  </div>

                  {/* CONTEXT 4개 chip */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>지금 이 순간의 조건 (CONTEXT)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {/* 요일 */}
                      <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e8eaed" }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>요일</p>
                        <p className="font-bold text-sm" style={{ color: "#1a1a1a" }}>
                          {["일","월","화","수","목","금","토"][new Date().getDay()]}요일
                        </p>
                      </div>
                      {/* 재고량 */}
                      <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e8eaed" }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>재고량</p>
                        <p className="font-bold text-sm" style={{ color: "#1a1a1a" }}>
                          {dynData?.stock != null ? `${dynData.stock}개` : "—"}
                        </p>
                        {dynData?.stock != null
                          ? <span className="text-[9px] font-semibold" style={{ color: "#10b981" }}>실데이터 연동됨</span>
                          : <span className="text-[9px]" style={{ color: "#9ca3af" }}>데이터 없음</span>}
                      </div>
                      {/* 경쟁가 */}
                      <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e8eaed" }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>경쟁가</p>
                        {dynData?.comp != null ? (
                          <>
                            <p className="font-bold text-sm" style={{ color: "#ef4444" }}>
                              ▼ {Math.abs(Math.round((dynData.comp - result.recommended_price) / result.recommended_price * 100))}%
                            </p>
                            <span className="text-[9px] font-semibold" style={{ color: "#10b981" }}>실데이터 연동됨</span>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-sm" style={{ color: "#9ca3af" }}>—</p>
                            <span className="text-[9px]" style={{ color: "#9ca3af" }}>데이터 없음</span>
                          </>
                        )}
                      </div>
                      {/* 시즌성 */}
                      <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e8eaed" }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>시즌성</p>
                        <p className="font-bold text-sm" style={{ color: "#f59e0b" }}>—</p>
                        <span className="text-[9px] font-semibold" style={{ color: "#f59e0b" }}>확인 필요</span>
                      </div>
                    </div>
                  </div>

                  {/* 가격 후보별 예상 성과 */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>가격 후보별 예상 성과</p>
                    <div className="space-y-2">
                      {DYN_ROWS.map((row, i) => {
                        const price = i === 0 ? result.min_price : i === 1 ? result.recommended_price : result.max_price;
                        return (
                          <div key={row.label} className="rounded-xl p-3" style={{ background: "white", border: `1.5px solid ${row.ai ? "#ef567c" : "#e8eaed"}` }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: row.ai ? "#ef567c" : "#9ca3af", margin: 0 }}>{row.label}</p>
                                <p className="font-extrabold text-sm" style={{ color: "#1a1a1a", margin: 0 }}>{price.toLocaleString()}원</p>
                              </div>
                              {row.ai && (
                                <span className="text-[10px] font-bold rounded-md px-2 py-0.5" style={{ background: "#ef567c", color: "white" }}>AI 선택</span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <div>
                                <div className="flex justify-between text-[10px] mb-1" style={{ color: "#9ca3af" }}>
                                  <span>예상 전환</span><span>{row.convLabel}</span>
                                </div>
                                <div className="h-1.5 rounded-full" style={{ background: "#e8eaed" }}>
                                  <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${row.convPct}%`, background: row.ai ? "#ef567c" : "#c8ccd4" }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[10px] mb-1" style={{ color: "#9ca3af" }}>
                                  <span>예상 마진</span><span>{row.marginLabel}</span>
                                </div>
                                <div className="h-1.5 rounded-full" style={{ background: "#e8eaed" }}>
                                  <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${row.marginPct}%`, background: row.ai ? "#ef567c" : "#c8ccd4" }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 이유 텍스트 */}
                  <div className="rounded-xl px-4 py-3" style={{ background: "white", border: "1px solid #e8eaed" }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider mr-2" style={{ color: "#9ca3af" }}>이유</span>
                    <span className="text-[12px]" style={{ color: "#4b5563" }}>
                      경쟁가 하락 중이지만 시즌성 상승 구간이라 소폭 방어 가능 — {result.recommended_price.toLocaleString()}원이 전환 손실 대비 마진 방어 균형점
                    </span>
                  </div>

                  <p className="text-[10px] text-center" style={{ color: "#9ca3af", margin: 0 }}>실시간 학습 아님 · 지금은 규칙+컨텍스트 기반 시뮬레이션 화면</p>
                </div>
              )}
            </div>

            {/* Margin bar - mobile only (desktop shows in hero col) */}
            <div className="lg:hidden rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
              <MarginBar rate={result.margin_rate} />
              {result.price_breakdown && result.price_breakdown.margin_per_unit > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t" style={{ borderColor: "#e8eaed" }}>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>총 원가</p>
                    <p className="font-bold text-sm" style={{ color: "#1a1a1a" }}>{result.price_breakdown.cost.toLocaleString()}원</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>건당 순이익</p>
                    <p className="font-bold text-sm" style={{ color: "#1a1a1a" }}>+{result.price_breakdown.margin_per_unit.toLocaleString()}원</p>
                  </div>
                </div>
              )}
            </div>

            {/* Strategy */}
            <div className="rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>가격 전략</p>
              <p className="text-sm leading-[1.75]" style={{ color: "#4b5563" }}>{result.strategy}</p>
            </div>

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>판매 팁</p>
                <div className="space-y-2.5">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "#f0f1f3", color: "#64676b" }}>{i + 1}</span>
                      <p className="text-sm leading-[1.75]" style={{ color: "#4b5563" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(productName)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border transition-colors hover:opacity-80"
              style={{ background: "white", borderColor: "#e8eaed", color: "#6b7280" }}>
              🔎 네이버 쇼핑에서 경쟁사 가격 직접 확인
            </a>

            <PolicyFilter text={[result.strategy, ...(result.tips ?? [])].join(" ")} />
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
