"use client";

import { useState, useEffect } from "react";
import PolicyFilter from "@/components/PolicyFilter";
import { useStream } from "@/lib/useStream";

interface OptimizedName { name: string; reason: string; keywords_used: string[] }
interface SeoResult {
  action_command?: string;
  score?: { current: string; issues: string[] };
  optimized_names: OptimizedName[];
  keyword_strategy?: { main_keyword: string; sub_keywords: string[]; recommendation: string };
  seo_tips: string[];
  avoid: string[];
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
      <span className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3, borderColor: "#e0ede9", borderTopColor: "#00aa6c" }} />
      <p className="text-sm font-semibold" style={{ color: "#0f2a1e" }}>AI가 분석 중입니다...</p>
      <p className="text-xs" style={{ color: "#9ca3af" }}>잠시만 기다려주세요</p>
    </div>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-2 rounded-full mt-2" style={{ background: "#e0ede9" }}>
      <div className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(score, 100)}%`, background: color }} />
    </div>
  );
}

export default function SeoTab({ initialKeyword }: { initialKeyword?: string }) {
  const [productName, setProductName] = useState(initialKeyword ?? "");
  useEffect(() => { if (initialKeyword) setProductName(initialKeyword); }, [initialKeyword]);

  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [searchVolume, setSearchVolume] = useState("");
  const [competitorCount, setCompetitorCount] = useState("");
  const [clickRate, setClickRate] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [showItemscout, setShowItemscout] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const { streaming, readStream } = useStream();

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true); setResult(null); setError("");
    try {
      const res = await fetch("/api/seo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, keywords, searchVolume, competitorCount, clickRate, priceRange }),
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

  const handleCopy = (text: string, index: number) => {
    const copy = () => {
      const el = document.createElement("textarea");
      el.value = text; el.style.cssText = "position:fixed;left:-9999px;opacity:0;";
      document.body.appendChild(el); el.focus(); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).catch(copy); } else { copy(); }
    setCopied(index); setTimeout(() => setCopied(null), 2000);
  };

  const currentScore = result?.score ? Number(result.score.current) || 0 : 0;
  const improvedScore = Math.min(currentScore + 22, 97);
  const strategyLabels = ["공격적", "중간", "안전"];
  const strategyColors = ["#ef4444", "#0f2a1e", "#00aa6c"];

  return (
    <div className="lg:grid lg:gap-7" style={{ gridTemplateColumns: "1fr 420px" }}>

      {/* ── LEFT: Hero ── */}
      <div className="mb-6 lg:mb-0">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#00aa6c" }}>
          SEO OPTIMIZER
        </p>
        <h1 className="font-extrabold leading-tight mb-2"
          style={{ fontSize: "clamp(26px,5vw,36px)", color: "#0f2a1e" }}>
          검색 1페이지<br />올리기
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b8c7a" }}>
          상품명 하나로 노출이 10배 달라집니다.<br className="hidden lg:block" />
          AI가 최적의 상품명을 만들어드려요.
        </p>
        <div className="hidden lg:block space-y-2.5 mb-6">
          {[
            "네이버 검색 알고리즘 최적화",
            "경쟁사 키워드 전략 분석",
            "상품명 3가지 버전 제공",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "#00aa6c" }}>✓</span>
              <span className="text-sm" style={{ color: "#4b7a63" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Score preview (after result) - desktop only */}
        {result?.score && (
          <div className="hidden lg:block space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>점수 비교</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>현재 점수</p>
                <p className="font-extrabold text-2xl" style={{ color: "#ef4444" }}>{result.score.current}점</p>
                <ScoreBar score={currentScore} color="#ef4444" />
              </div>
              <div className="rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#00aa6c" }}>예상 개선</p>
                <p className="font-extrabold text-2xl" style={{ color: "#00aa6c" }}>{improvedScore}점</p>
                <ScoreBar score={improvedScore} color="#00aa6c" />
              </div>
            </div>
            {result.score.issues?.length > 0 && (
              <div className="space-y-1.5">
                {result.score.issues.map((issue, i) => (
                  <div key={i} className="flex gap-2 text-xs" style={{ color: "#9ca3af" }}>
                    <span style={{ color: "#f59e0b" }}>⚠</span>{issue}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Card ── */}
      <div style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>분석 입력</p>
          <h2 className="font-bold text-base" style={{ color: "#0f2a1e" }}>상품명 SEO 최적화</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>현재 상품명을 입력하면 AI가 분석합니다</p>
        </div>

        {/* Form */}
        <div className="space-y-3.5">
          <div>
            <label className={labelCls} style={labelStyle}>현재 상품명 <span className="text-red-400 normal-case">*</span></label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="예) 아로니아 분말 500g" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>카테고리</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="예) 식품 > 건강식품" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>강조 키워드</label>
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="예) 유기농, 국산, 당일발송" className={inputCls} style={inputStyle} />
          </div>

          {/* Itemscout */}
          <div className="rounded-xl border-dashed border p-4" style={{ borderColor: "#b2d8c8", background: "#f7fdf9" }}>
            <button type="button" onClick={() => setShowItemscout(!showItemscout)}
              className="w-full flex items-center justify-between text-sm font-semibold cursor-pointer"
              style={{ color: "#00aa6c" }}>
              <span>📊 아이템스카우트 데이터 입력 <span className="text-xs font-normal" style={{ color: "#9ca3af" }}>(선택)</span></span>
              <span className="text-xs" style={{ color: "#9ca3af" }}>{showItemscout ? "▲" : "▼"}</span>
            </button>
            {showItemscout && (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                  { label: "월간 검색량", val: searchVolume, set: setSearchVolume, ph: "예) 12,400" },
                  { label: "경쟁 상품 수", val: competitorCount, set: setCompetitorCount, ph: "예) 3,200개" },
                  { label: "클릭 경쟁률", val: clickRate, set: setClickRate, ph: "예) 낮음 / 0.26" },
                  { label: "상위 가격대", val: priceRange, set: setPriceRange, ph: "예) 15,000~25,000원" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>{f.label}</label>
                    <input type="text" value={f.val} onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      className="w-full text-xs rounded-lg px-3 py-2 outline-none placeholder:text-gray-400"
                      style={{ background: "white", border: "1px solid #e0ede9", color: "#0f2a1e" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={loading || streaming || !productName}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: "#00aa6c" }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />연결 중...
                </span>
              : "🔍 상품명 최적화하기"}
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

            {/* Score cards - mobile only (desktop shows in hero col) */}
            {result.score && (
              <div className="lg:hidden grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>현재 점수</p>
                  <p className="font-extrabold text-2xl" style={{ color: "#ef4444" }}>{result.score.current}점</p>
                  <ScoreBar score={currentScore} color="#ef4444" />
                </div>
                <div className="rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#00aa6c" }}>예상 개선</p>
                  <p className="font-extrabold text-2xl" style={{ color: "#00aa6c" }}>{improvedScore}점</p>
                  <ScoreBar score={improvedScore} color="#00aa6c" />
                </div>
              </div>
            )}

            {/* Keyword strategy */}
            {result.keyword_strategy && (
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>키워드 전략</p>
                <div className="mb-3">
                  <p className="text-xs mb-1.5" style={{ color: "#9ca3af" }}>메인 키워드</p>
                  <span className="text-sm font-bold px-3 py-1.5 rounded-full text-white"
                    style={{ background: "#0f2a1e" }}>{result.keyword_strategy.main_keyword}</span>
                </div>
                <div className="mb-3">
                  <p className="text-xs mb-1.5" style={{ color: "#9ca3af" }}>세부 키워드</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keyword_strategy.sub_keywords?.map((kw, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: "#e8f5f0", color: "#00aa6c" }}>#{kw}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs" style={{ color: "#6b7280" }}>{result.keyword_strategy.recommendation}</p>
              </div>
            )}

            {/* Optimized names */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>추천 상품명 3가지</p>
              <div className="space-y-2.5">
                {result.optimized_names?.map((item, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                        style={{ background: strategyColors[i] }}>{strategyLabels[i]}</span>
                      <button onClick={() => handleCopy(item.name, i)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors"
                        style={{ background: copied === i ? "#e8f5f0" : "#f0f0f5", color: copied === i ? "#00aa6c" : "#6b7280" }}>
                        {copied === i ? "✓ 복사됨!" : "📋 복사"}
                      </button>
                    </div>
                    <p className="font-bold text-sm mb-1.5" style={{ color: "#0f2a1e" }}>{item.name}</p>
                    <p className="text-xs mb-2" style={{ color: "#6b7280" }}>{item.reason}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.keywords_used?.map((kw, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "#e8f5f0", color: "#00aa6c" }}>#{kw}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO Tips */}
            {result.seo_tips?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>SEO 노출 팁</p>
                <div className="space-y-2">
                  {result.seo_tips.map((tip, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "#00aa6c" }}>{i + 1}</span>
                      <p className="text-sm" style={{ color: "#374151" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avoid */}
            {result.avoid?.length > 0 && (
              <div className="rounded-xl p-4 bg-red-50 border border-red-100">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-red-500">이것은 피하세요</p>
                <div className="space-y-1.5">
                  {result.avoid.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-red-400 text-xs mt-0.5">✕</span>
                      <p className="text-xs text-red-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PolicyFilter text={result.optimized_names?.map(n => n.name).join(" ")} />
          </div>
        )}
      </div>
    </div>
  );
}
