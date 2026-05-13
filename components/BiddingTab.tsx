"use client";

import { useState } from "react";
import PolicyFilter from "@/components/PolicyFilter";
import { useStream } from "@/lib/useStream";

interface Keyword {
  keyword: string; type: string; estimated_cpc: string; bid_amount?: string;
  bid_command?: string; competition: string; recommended: boolean; reason: string;
}
interface BiddingResult {
  today_action?: string;
  keywords: Keyword[];
  strategy: { phase1: string; phase2: string; phase3: string };
  budget_allocation: { small_keywords: string; medium_keywords: string; reason: string };
  roi_estimate: string;
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

function SkeletonResult() {
  return (
    <div className="mt-5 space-y-3 animate-pulse">
      <div className="h-14 rounded-xl" style={{ background: "#e8f5f0" }} />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl" style={{ background: "#f0f4f3" }} />)}
      </div>
      <div className="h-6 rounded-lg w-1/3" style={{ background: "#e8f5f0" }} />
      {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: "#f0f4f3" }} />)}
      <div className="h-28 rounded-xl" style={{ background: "#f0f4f3" }} />
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>{label}</p>
      <p className="font-extrabold text-lg leading-none" style={{ color: color || "#0f2a1e" }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}

export default function BiddingTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [result, setResult] = useState<BiddingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { streaming, readStream } = useStream();

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true); setResult(null); setError("");
    try {
      const res = await fetch("/api/bidding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, dailyBudget, sellingPrice }),
      });
      setLoading(false);
      await readStream(res, (text) => {
        try {
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON");
          setResult(JSON.parse(match[0]));
        } catch { setError("분석 결과를 불러오지 못했습니다. 다시 시도해주세요."); }
      }, () => setError("오류가 발생했습니다. 다시 시도해주세요."));
    } catch { setLoading(false); setError("오류가 발생했습니다. 다시 시도해주세요."); }
  };

  const competitionColor = (c: string) => c === "높음" ? "#ef4444" : c === "중간" ? "#f59e0b" : "#00aa6c";
  const typeColor = (t: string) => t === "대형" ? "#ef4444" : t === "중형" ? "#f97316" : "#00aa6c";

  return (
    <div className="lg:grid lg:gap-7" style={{ gridTemplateColumns: "1fr 420px" }}>

      {/* ── LEFT: Hero ── */}
      <div className="mb-6 lg:mb-0">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#00aa6c" }}>
          AD STRATEGY
        </p>
        <h1 className="font-extrabold leading-tight mb-2"
          style={{ fontSize: "clamp(26px,5vw,36px)", color: "#0f2a1e" }}>
          광고 대행사<br />없이, AI가 대신
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b8c7a" }}>
          적은 예산으로 상단 노출되는<br className="hidden lg:block" />
          키워드 입찰 전략을 만들어드립니다.
        </p>
        <div className="hidden lg:block space-y-2.5 mb-6">
          {[
            "소규모 예산 최적화 전략",
            "키워드별 AI 추정 입찰가 제안",
            "단계별 광고 로드맵 제공",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "#00aa6c" }}>✓</span>
              <span className="text-sm" style={{ color: "#4b7a63" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Budget allocation preview (after result) - desktop only */}
        {result?.budget_allocation && (
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>예산 배분</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#00aa6c" }}>소형 키워드</p>
                <p className="font-extrabold text-3xl" style={{ color: "#00aa6c" }}>{result.budget_allocation.small_keywords}%</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>중형 키워드</p>
                <p className="font-extrabold text-3xl" style={{ color: "#0f2a1e" }}>{result.budget_allocation.medium_keywords}%</p>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: "#6b7280" }}>{result.budget_allocation.reason}</p>
          </div>
        )}

        {/* ROI estimate (after result) - desktop only */}
        {result?.roi_estimate && (
          <div className="hidden lg:block mt-4 rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>예상 광고 ROI</p>
            <p className="text-sm" style={{ color: "#0f2a1e" }}>{result.roi_estimate}</p>
          </div>
        )}
      </div>

      {/* ── RIGHT: Card ── */}
      <div style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>전략 생성</p>
          <h2 className="font-bold text-base" style={{ color: "#0f2a1e" }}>키워드 입찰 전략</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>상품 정보를 입력하면 AI가 최적 전략을 만듭니다</p>
        </div>

        {/* Form */}
        <div className="space-y-3.5">
          <div>
            <label className={labelCls} style={labelStyle}>상품명 <span className="text-red-400 normal-case">*</span></label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="예) 무선 블루투스 이어폰" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>카테고리</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="예) 디지털 > 이어폰" className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>일 광고 예산</label>
              <div className="relative">
                <input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)}
                  placeholder="30000" className={inputCls + " pr-8"} style={inputStyle} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#9ca3af" }}>원</span>
              </div>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>판매가</label>
              <div className="relative">
                <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)}
                  placeholder="15000" className={inputCls + " pr-8"} style={inputStyle} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#9ca3af" }}>원</span>
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading || streaming || !productName}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: "#00aa6c" }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />연결 중...
                </span>
              : "💡 키워드 입찰 전략 만들기"}
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
            {/* Today action */}
            {result.today_action && (
              <div className="rounded-xl p-4 border-l-4" style={{ background: "#e8f5f0", borderColor: "#00aa6c" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#00aa6c" }}>⚡ 오늘 광고 관리자에서 바로 실행</p>
                <p className="text-sm font-bold" style={{ color: "#0f2a1e" }}>{result.today_action}</p>
              </div>
            )}

            {/* 3 metrics */}
            {result.keywords?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <MetricCard label="추천 키워드" value={String(result.keywords.filter(k => k.recommended).length)} sub="개" color="#00aa6c" />
                <MetricCard label="전체 키워드" value={String(result.keywords.length)} sub="개" />
                <MetricCard label="일 예산" value={dailyBudget ? `${Number(dailyBudget).toLocaleString()}` : "—"} sub="원" />
              </div>
            )}

            {/* Keywords */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>추천 키워드 목록</p>
              <div className="space-y-2.5">
                {result.keywords?.map((kw, i) => (
                  <div key={i} className="rounded-xl p-4"
                    style={{ background: "#f7faf9", border: `1px solid ${kw.recommended ? "#b2d8c8" : "#e0ede9"}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {kw.recommended && (
                          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                            style={{ background: "#7c3aed" }}>추천</span>
                        )}
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                          style={{ background: typeColor(kw.type) }}>{kw.type}</span>
                        <span className="font-bold text-sm" style={{ color: "#0f2a1e" }}>{kw.keyword}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: competitionColor(kw.competition) }}>
                        경쟁 {kw.competition}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#6b7280" }}>
                        예상 CPC: <strong style={{ color: "#0f2a1e" }}>{kw.estimated_cpc}원</strong>
                        <span className="ml-1.5 text-[10px] font-normal px-1.5 py-0.5 rounded"
                          style={{ background: "#f0f4f3", color: "#9ca3af" }}>AI 추정값</span>
                      </span>
                      {kw.bid_amount && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: "#e8f5f0", color: "#00aa6c" }}>
                          권장 {Number(kw.bid_amount).toLocaleString()}원
                        </span>
                      )}
                    </div>
                    {kw.bid_command && (
                      <div className="rounded-lg px-3 py-2 border" style={{ background: "#f0fdf8", borderColor: "#b2d8c8" }}>
                        <p className="text-xs font-medium" style={{ color: "#007a4d" }}>👉 {kw.bid_command}</p>
                      </div>
                    )}
                    <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>{kw.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget allocation - mobile only (desktop shows in hero col) */}
            {result.budget_allocation && (
              <div className="lg:hidden rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>예산 배분 전략</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#00aa6c" }}>소형 키워드</p>
                    <p className="font-extrabold text-2xl" style={{ color: "#00aa6c" }}>{result.budget_allocation.small_keywords}%</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>중형 키워드</p>
                    <p className="font-extrabold text-2xl" style={{ color: "#0f2a1e" }}>{result.budget_allocation.medium_keywords}%</p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "#6b7280" }}>{result.budget_allocation.reason}</p>
              </div>
            )}

            {/* Phase strategy */}
            {result.strategy && (
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>단계별 광고 전략</p>
                <div className="space-y-2.5">
                  {[
                    { label: "1~2주차", content: result.strategy.phase1, color: "#ef4444" },
                    { label: "3~4주차", content: result.strategy.phase2, color: "#f59e0b" },
                    { label: "2개월+",  content: result.strategy.phase3, color: "#00aa6c" },
                  ].map((p, i) => (
                    <div key={i} className="flex gap-2.5 rounded-lg p-2.5" style={{ background: "white" }}>
                      <span className="text-[10px] font-bold text-white px-2 py-1 rounded-md flex-shrink-0 h-fit"
                        style={{ background: p.color }}>{p.label}</span>
                      <p className="text-xs" style={{ color: "#374151" }}>{p.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ROI - mobile only */}
            {result.roi_estimate && (
              <div className="lg:hidden rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>예상 광고 ROI</p>
                <p className="text-sm" style={{ color: "#0f2a1e" }}>{result.roi_estimate}</p>
              </div>
            )}

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>광고 운영 팁</p>
                <div className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs mt-0.5" style={{ color: "#00aa6c" }}>•</span>
                      <p className="text-sm" style={{ color: "#374151" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PolicyFilter text={[...(result.keywords?.map(k => k.keyword) ?? []), ...(result.tips ?? [])].join(" ")} />
          </div>
        )}
      </div>
    </div>
  );
}
