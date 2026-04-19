"use client";

import { useState, useEffect, useRef } from "react";

interface TrendData { dates: string[]; ratios: number[] }
interface Gender { male_pct: number; female_pct: number }
interface Age { [key: string]: number }
interface Related { keyword: string; avg: number; growth: number }
interface AiAnalysis {
  verdict: "good" | "bad" | "neutral";
  action_command: string;
  reason: string;
  tips: string[];
}
interface TrendResult {
  keyword: string;
  trend: TrendData;
  gender: Gender;
  age: Age;
  related: Related[];
  aiAnalysis: AiAnalysis;
}
interface HotKeyword { keyword: string; avg: number; growth: number; comment: string }
interface AutoResult { mode: "auto"; season: string; hotKeywords: HotKeyword[]; updatedAt: string }

/* ── Styles ── */
const CARD: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  border: "1px solid #e0ede9",
};

function LineChart({ dates, ratios }: TrendData) {
  if (!ratios.length) return null;
  const W = 400, H = 90, PX = 8, PY = 8;
  const max = Math.max(...ratios, 1);
  const pts = ratios.map((r, i) => {
    const x = PX + (i / Math.max(ratios.length - 1, 1)) * (W - PX * 2);
    const y = PY + (1 - r / max) * (H - PY * 2);
    return [x, y] as [number, number];
  });
  const poly = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pts[0][0]},${H - PY} ${poly} ${pts[pts.length - 1][0]},${H - PY}`;
  const peakIdx = ratios.indexOf(Math.max(...ratios));
  const lastIdx = ratios.length - 1;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00aa6c" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00aa6c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v} x1={PX} x2={W - PX}
            y1={PY + (1 - v) * (H - PY * 2)} y2={PY + (1 - v) * (H - PY * 2)}
            stroke="#e0ede9" strokeWidth="1" />
        ))}
        <polygon points={area} fill="url(#tg2)" />
        <polyline points={poly} fill="none" stroke="#00aa6c"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r="4" fill="#007a4d" stroke="white" strokeWidth="2" />
        <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r="3.5" fill="#00aa6c" stroke="white" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[10px] mt-1 px-1" style={{ color: "#9ca3af" }}>
        {[0, Math.floor((ratios.length - 1) / 2), ratios.length - 1].map(i => (
          <span key={i}>{dates[i]}</span>
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-12 flex-shrink-0" style={{ color: "#6b7280" }}>{label}</span>
      <div className="flex-1 rounded-full h-1.5" style={{ background: "#e0ede9" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: "#0f2a1e" }}>{value}%</span>
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

export default function TrendTab({ onSeoNavigate }: { onSeoNavigate?: (keyword: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoData, setAutoData] = useState<AutoResult | null>(null);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) {
      resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  const loadHotKeywords = async () => {
    setLoadingAuto(true);
    try {
      const res = await fetch("/api/naver-trend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      const data = await res.json();
      if (!data.error) setAutoData(data);
    } catch { /* silent */ }
    finally { setLoadingAuto(false); }
  };

  useEffect(() => { loadHotKeywords(); }, []);

  const handleSearch = async (kw?: string) => {
    const target = (kw ?? keyword).trim();
    if (!target) return;
    if (!kw) setKeyword(target);
    setLoading(true); setResult(null); setError("");
    try {
      const res = await fetch("/api/naver-trend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: target }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResult(data);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally { setLoading(false); }
  };

  const verdictCfg = {
    good:    { bg: "#e8f5f0", border: "#00aa6c", icon: "🟢", label: "지금 팔기 좋음",   color: "#007a4d" },
    bad:     { bg: "#fef2f2", border: "#ef4444", icon: "🔴", label: "지금 팔기 어려움",  color: "#dc2626" },
    neutral: { bg: "#fffbeb", border: "#f59e0b", icon: "🟡", label: "중립 — 준비 단계", color: "#b45309" },
  };

  return (
    <div className="lg:grid lg:gap-7" style={{ gridTemplateColumns: "1fr 420px" }}>

      {/* ── LEFT: Hero + Hot Keywords ── */}
      <div className="mb-6 lg:mb-0">
        {/* Section label */}
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#00aa6c" }}>
          TREND ANALYZER
        </p>
        {/* Title */}
        <h1 className="font-extrabold leading-tight mb-2"
          style={{ fontSize: "clamp(26px,5vw,36px)", color: "#0f2a1e" }}>
          지금 뭐가<br />팔려?
        </h1>
        {/* Description */}
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b8c7a" }}>
          실시간 네이버 검색량 기반으로<br className="hidden lg:block" />
          AI가 &quot;지금 팔리는 키워드&quot;를 분析합니다
        </p>
        {/* Feature bullets - desktop only */}
        <div className="hidden lg:block space-y-2.5 mb-6">
          {[
            "실시간 네이버 검색량 데이터",
            "AI 판매 가능성 자동 분析",
            "급상승 키워드 자동 추천",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "#00aa6c" }}>✓</span>
              <span className="text-sm" style={{ color: "#4b7a63" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Hot keywords */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>🔥 오늘의 급상승 키워드</p>
              {autoData && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#e8f5f0", color: "#00aa6c" }}>
                  {autoData.season} 시즌
                </span>
              )}
            </div>
            <button onClick={loadHotKeywords} disabled={loadingAuto}
              className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer border transition-colors disabled:opacity-40"
              style={{ background: "#f7faf9", color: "#00aa6c", borderColor: "#e0ede9" }}>
              {loadingAuto
                ? <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#00aa6c" }} />
                : "🔄"
              } 새로고침
            </button>
          </div>

          {loadingAuto && (
            <div className="flex items-center gap-2 py-4" style={{ color: "#9ca3af" }}>
              <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#00aa6c" }} />
              <span className="text-sm">시즌 키워드 분析 중...</span>
            </div>
          )}

          {!loadingAuto && autoData && autoData.hotKeywords.length > 0 && (
            <div className="space-y-2">
              {autoData.hotKeywords.map((hk, i) => (
                <button key={hk.keyword}
                  onClick={() => { setKeyword(hk.keyword); handleSearch(hk.keyword); }}
                  className="w-full text-left flex items-center justify-between rounded-xl px-4 py-3 transition-all border cursor-pointer"
                  style={{ background: "#f7faf9", borderColor: "#e0ede9" }}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#00aa6c" }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#0f2a1e" }}>{hk.keyword}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{hk.comment}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-xs" style={{ color: "#9ca3af" }}>지수 {hk.avg}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hk.growth > 0 ? "bg-green-100 text-green-700" :
                      hk.growth < 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                      {hk.growth > 0 ? "▲" : hk.growth < 0 ? "▼" : "–"}{Math.abs(hk.growth)}%
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: "#00aa6c" }}>분析 →</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loadingAuto && !autoData && (
            <p className="text-sm py-3" style={{ color: "#9ca3af" }}>키워드를 불러오지 못했습니다. 새로고침을 눌러주세요.</p>
          )}
        </div>
      </div>

      {/* ── RIGHT: Search Card + Results ── */}
      <div ref={resultCardRef} style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>직접 검색</p>
          <h2 className="font-bold text-base" style={{ color: "#0f2a1e" }}>키워드 트렌드 분析</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>검색하고 싶은 키워드를 직접 입력하세요</p>
        </div>

        {/* Search input */}
        <div className="flex gap-2 mb-4">
          <input type="text" value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="예) 아로니아, 무선 이어폰, 여름 원피스"
            className="flex-1 text-sm rounded-lg px-4 py-3 outline-none transition-all placeholder:text-gray-400"
            style={{ background: "#f7faf9", border: "1px solid #e0ede9", color: "#0f2a1e" }} />
          <button onClick={() => handleSearch()} disabled={loading || !keyword.trim()}
            className="px-4 py-3 rounded-lg font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex-shrink-0 transition-colors"
            style={{ background: "#00aa6c", color: "white" }}>
            {loading
              ? <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />분석
                </span>
              : "🔍 분석"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg p-3 text-sm text-red-600 bg-red-50 border border-red-100 mb-4">{error}</div>
        )}

        {loading && (
          <div className="py-8 flex flex-col items-center gap-3">
            <span className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: "solid", borderColor: "#e0ede9", borderTopColor: "#00aa6c" }} />
            <p className="text-sm font-semibold" style={{ color: "#0f2a1e" }}>AI가 분석 중입니다...</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>네이버 실시간 데이터 수집 중 (10~30초 소요)</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* AI verdict */}
            {result.aiAnalysis?.verdict && (() => {
              const cfg = verdictCfg[result.aiAnalysis.verdict];
              return (
                <div className="rounded-xl p-4 border-l-4" style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{cfg.icon}</span>
                    <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <p className="text-sm font-bold mb-1.5" style={{ color: cfg.color }}>
                    ⚡ {result.aiAnalysis.action_command}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{result.aiAnalysis.reason}</p>
                </div>
              );
            })()}

            {/* 3 metrics */}
            {result.trend.ratios.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <MetricCard label="검색 피크" value={String(Math.max(...result.trend.ratios))} sub="최고지수" />
                <MetricCard label="연관 키워드"
                  value={String(result.related.length)}
                  sub="상승 키워드" color="#00aa6c" />
                <MetricCard label="AI 판정"
                  value={result.aiAnalysis.verdict === "good" ? "🟢" : result.aiAnalysis.verdict === "bad" ? "🔴" : "🟡"}
                  sub={result.aiAnalysis.verdict === "good" ? "판매 적합" : result.aiAnalysis.verdict === "bad" ? "위험" : "보통"} />
              </div>
            )}

            {/* Trend chart */}
            {result.trend.ratios.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>
                    최근 30일 트렌드
                    <span className="ml-1 normal-case font-bold" style={{ color: "#00aa6c" }}>"{result.keyword}"</span>
                  </p>
                </div>
                <LineChart dates={result.trend.dates} ratios={result.trend.ratios} />
              </div>
            )}

            {/* Related keywords */}
            {result.related.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                  급상승 연관 키워드 TOP {result.related.length}
                </p>
                <div className="space-y-1.5">
                  {result.related.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                          style={{ background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#00aa6c" }}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "#0f2a1e" }}>{r.keyword}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "#9ca3af" }}>지수 {r.avg}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.growth > 0 ? "bg-green-100 text-green-700" :
                          r.growth < 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                          {r.growth > 0 ? "▲" : r.growth < 0 ? "▼" : "–"}{Math.abs(r.growth)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gender / Age */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#9ca3af" }}>성별 비율</p>
                <div className="space-y-2">
                  <BarRow label="남성" value={result.gender.male_pct} color="#00aa6c" />
                  <BarRow label="여성" value={result.gender.female_pct} color="#f472b6" />
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#9ca3af" }}>연령대</p>
                <div className="space-y-2">
                  {Object.entries(result.age).map(([label, val]) => (
                    <BarRow key={label} label={label} value={val} color="#0f2a1e" />
                  ))}
                </div>
              </div>
            </div>

            {/* Action plan */}
            {result.aiAnalysis.tips?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#e8f5f0", border: "1px solid #b2d8c8" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#00aa6c" }}>
                  실행 액션 플랜
                </p>
                <div className="space-y-2">
                  {result.aiAnalysis.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "#00aa6c" }}>{i + 1}</span>
                      <p className="text-sm" style={{ color: "#0f5c38" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEO navigate */}
            {onSeoNavigate && (
              <button onClick={() => onSeoNavigate(result.keyword)}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: "#0f2a1e" }}>
                📈 이 키워드로 상품명 만들기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
