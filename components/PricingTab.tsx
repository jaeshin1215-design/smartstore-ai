"use client";

import { useState } from "react";
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
  border: "1px solid #e0ede9",
};
const inputCls = "w-full text-sm rounded-lg px-4 py-3 outline-none transition-all placeholder:text-gray-400 text-[#0f2a1e]";
const inputStyle: React.CSSProperties = { background: "#f7faf9", border: "1px solid #e0ede9" };
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const labelStyle: React.CSSProperties = { color: "#9ca3af" };

function LoadingBox() {
  return (
    <div className="mt-4 rounded-xl p-6 flex flex-col items-center gap-3" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
      <span className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: "solid", borderColor: "#e0ede9", borderTopColor: "#00aa6c" }} />
      <p className="text-sm font-semibold" style={{ color: "#0f2a1e" }}>AI가 분석 중입니다...</p>
      <p className="text-xs" style={{ color: "#9ca3af" }}>잠시만 기다려주세요</p>
    </div>
  );
}

function MarginBar({ rate }: { rate: number }) {
  const clamped = Math.min(Math.max(rate, 0), 100);
  const color = clamped >= 30 ? "#00aa6c" : clamped >= 15 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: "#9ca3af" }}>마진율</span>
        <span className="font-bold" style={{ color }}>{rate}%</span>
      </div>
      <div className="h-2.5 rounded-full" style={{ background: "#e0ede9" }}>
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PricingTab() {
  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [shippingCost, setShippingCost] = useState("3000");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { streaming, readStream } = useStream();

  const platformFee = purchasePrice ? Math.round(Number(purchasePrice) * 0.0585) : 0;
  const totalCost = purchasePrice ? Number(purchasePrice) + Number(shippingCost || 3000) + platformFee : 0;

  const handleSubmit = async () => {
    if (!productName || !purchasePrice) return;
    setLoading(true); setResult(null); setError("");
    try {
      const res = await fetch("/api/pricing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, purchasePrice, shippingCost, competitorPrice, targetMargin, category, features }),
      });
      setLoading(false);
      await readStream(res, (text) => {
        try {
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON");
          const p = JSON.parse(match[0]);
          setResult({
            action_command: p.action_command || "",
            recommended_price: Number(p.recommended_price) || 0,
            min_price: Number(p.min_price) || 0,
            max_price: Number(p.max_price) || 0,
            margin_rate: Number(p.margin_rate) || 0,
            price_breakdown: {
              cost: Number(p.price_breakdown?.cost) || totalCost,
              profit: Number(p.price_breakdown?.profit) || 0,
              margin_per_unit: Number(p.price_breakdown?.margin_per_unit) || 0,
            },
            strategy: p.strategy || "",
            tips: Array.isArray(p.tips) ? p.tips : [],
          });
        } catch { setError("분석 결과를 불러오지 못했습니다. 다시 시도해주세요."); }
      }, () => setError("오류가 발생했습니다. 다시 시도해주세요."));
    } catch { setLoading(false); setError("오류가 발생했습니다. 다시 시도해주세요."); }
  };

  return (
    <div className="lg:grid lg:gap-7" style={{ gridTemplateColumns: "1fr 420px" }}>

      {/* ── LEFT: Hero ── */}
      <div className="mb-6 lg:mb-0">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#00aa6c" }}>
          PRICE OPTIMIZER
        </p>
        <h1 className="font-extrabold leading-tight mb-2"
          style={{ fontSize: "clamp(26px,5vw,36px)", color: "#0f2a1e" }}>
          얼마에 팔아야<br />남지?
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b8c7a" }}>
          매입가를 입력하면 AI가<br className="hidden lg:block" />
          최적 판매가와 마진 전략을 분석합니다.
        </p>
        <div className="hidden lg:block space-y-2.5 mb-6">
          {[
            "수수료·배송비 자동 계산",
            "경쟁사 가격 비교 분석",
            "마진율 최적화 전략 제공",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "#00aa6c" }}>✓</span>
              <span className="text-sm" style={{ color: "#4b7a63" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Cost preview - desktop only */}
        {purchasePrice && (
          <div className="hidden lg:block rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#00aa6c" }}>원가 계산 미리보기</p>
            <div className="space-y-2">
              {[
                { label: "매입가", val: Number(purchasePrice) },
                { label: "배송비", val: Number(shippingCost || 3000) },
                { label: "수수료 (5.85%)", val: platformFee },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm" style={{ color: "#007a4d" }}>
                  <span>{r.label}</span>
                  <span>{r.val.toLocaleString()}원</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t"
                style={{ color: "#0f2a1e", borderColor: "#b2d8c8" }}>
                <span>총 원가</span>
                <span>{totalCost.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        )}

        {/* Margin result - desktop only */}
        {result && (
          <div className="hidden lg:block mt-4 rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>마진 분석</p>
            <MarginBar rate={result.margin_rate} />
            {result.price_breakdown && result.price_breakdown.margin_per_unit > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t" style={{ borderColor: "#e0ede9" }}>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>총 원가</p>
                  <p className="font-bold text-sm" style={{ color: "#0f2a1e" }}>{result.price_breakdown.cost.toLocaleString()}원</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>건당 순이익</p>
                  <p className="font-bold text-sm" style={{ color: "#00aa6c" }}>+{result.price_breakdown.margin_per_unit.toLocaleString()}원</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Card ── */}
      <div style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>가격 분석</p>
          <h2 className="font-bold text-base" style={{ color: "#0f2a1e" }}>최적 판매가 계산</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>매입가 입력 → AI가 마진 전략 분석</p>
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

          {/* Cost preview - mobile only */}
          {purchasePrice && (
            <div className="lg:hidden rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#00aa6c" }}>원가 미리보기</p>
              <div className="space-y-1.5">
                {[
                  { label: "매입가", val: Number(purchasePrice) },
                  { label: "배송비", val: Number(shippingCost || 3000) },
                  { label: "수수료 5.85%", val: platformFee },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-xs" style={{ color: "#007a4d" }}>
                    <span>{r.label}</span><span>{r.val.toLocaleString()}원</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-1.5 border-t"
                  style={{ color: "#0f2a1e", borderColor: "#b2d8c8" }}>
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
            style={{ background: "#00aa6c" }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />연결 중...
                </span>
              : "💰 최적 가격 분석하기"}
          </button>
        </div>

        {streaming && <LoadingBox />}
        {error && !streaming && (
          <div className="mt-4 rounded-xl p-4 border" style={{ background: "#fff1f0", borderColor: "#fca5a5" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && !streaming && (
          <div className="mt-5 space-y-4">
            {/* Action command */}
            {result.action_command && (
              <div className="rounded-xl p-4 border-l-4" style={{ background: "#e8f5f0", borderColor: "#00aa6c" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#00aa6c" }}>⚡ 지금 바로 실행하세요</p>
                <p className="text-sm font-bold" style={{ color: "#0f2a1e" }}>{result.action_command}</p>
              </div>
            )}

            {/* 3-column price cards */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>판매가 범위</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-3.5 text-center" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                  <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "#9ca3af" }}>최소 판매가</p>
                  <p className="font-extrabold text-base leading-none" style={{ color: "#0f2a1e" }}>
                    {result.min_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>원</p>
                </div>
                <div className="rounded-xl p-3.5 text-center" style={{ background: "#0f2a1e" }}>
                  <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>✨ 추천가</p>
                  <p className="font-extrabold text-base leading-none text-white">
                    {result.recommended_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>원</p>
                </div>
                <div className="rounded-xl p-3.5 text-center" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                  <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "#9ca3af" }}>최대 판매가</p>
                  <p className="font-extrabold text-base leading-none" style={{ color: "#0f2a1e" }}>
                    {result.max_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>원</p>
                </div>
              </div>
            </div>

            {/* Margin bar - mobile only (desktop shows in hero col) */}
            <div className="lg:hidden rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
              <MarginBar rate={result.margin_rate} />
              {result.price_breakdown && result.price_breakdown.margin_per_unit > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t" style={{ borderColor: "#e0ede9" }}>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>총 원가</p>
                    <p className="font-bold text-sm" style={{ color: "#0f2a1e" }}>{result.price_breakdown.cost.toLocaleString()}원</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>건당 순이익</p>
                    <p className="font-bold text-sm" style={{ color: "#00aa6c" }}>+{result.price_breakdown.margin_per_unit.toLocaleString()}원</p>
                  </div>
                </div>
              )}
            </div>

            {/* Strategy */}
            <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>가격 전략</p>
              <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{result.strategy}</p>
            </div>

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>판매 팁</p>
                <div className="space-y-2.5">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "#00aa6c" }}>{i + 1}</span>
                      <p className="text-sm" style={{ color: "#374151" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(productName)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border transition-colors hover:opacity-80"
              style={{ background: "white", borderColor: "#e0ede9", color: "#6b7280" }}>
              🔎 네이버 쇼핑에서 경쟁사 가격 직접 확인
            </a>

            <PolicyFilter text={[result.strategy, ...(result.tips ?? [])].join(" ")} />
          </div>
        )}
      </div>
    </div>
  );
}
