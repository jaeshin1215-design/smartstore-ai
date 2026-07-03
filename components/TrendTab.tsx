"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Module-level cache: survives tab switches ── */
let _autoCache: AutoResult | null = null;
let _autoFetching = false;
type PhaseCb = (keywords: HotKeyword[], season: string) => void;
type FinalCb = (result: AutoResult) => void;
let _phaseListeners: PhaseCb[] = [];
let _finalListeners: FinalCb[] = [];

async function _runAutoStream() {
  if (_autoFetching) return;
  _autoFetching = true;
  try {
    const res = await fetch("/api/naver-trend", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "auto" }),
    });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === "auto_phase") {
            [..._phaseListeners].forEach(fn => fn(obj.hotKeywords, obj.season));
          }
          if (obj.type === "auto_final") {
            _autoCache = { mode: "auto", season: obj.season, hotKeywords: obj.hotKeywords, updatedAt: obj.updatedAt };
            [..._finalListeners].forEach(fn => fn(_autoCache!));
            _phaseListeners = []; _finalListeners = [];
          }
        } catch { /* 파싱 실패 무시 */ }
      }
    }
  } catch { /* silent */ }
  finally { _autoFetching = false; }
}

export function preloadHotKeywords() {
  if (!_autoCache && !_autoFetching) _runAutoStream();
}

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
  aiAnalysis: AiAnalysis | null;
}
interface HotKeyword { keyword: string; avg: number; growth: number; comment: string }
interface AutoResult { mode: "auto"; season: string; hotKeywords: HotKeyword[]; updatedAt: string }

/* ── Shared card style for right panel ── */
const CARD: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e8eaed",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

/* ── Chart: calm slate-teal ── */
function LineChart({ dates, ratios }: TrendData) {
  if (!ratios.length) return null;
  const W = 400, H = 80, PX = 6, PY = 6;
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="tg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7b9ea8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7b9ea8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v} x1={PX} x2={W - PX}
            y1={PY + (1 - v) * (H - PY * 2)} y2={PY + (1 - v) * (H - PY * 2)}
            stroke="#f0f1f3" strokeWidth="1" />
        ))}
        <polygon points={area} fill="url(#tg3)" />
        <polyline points={poly} fill="none" stroke="#7b9ea8"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r="3.5" fill="#5a8090" stroke="white" strokeWidth="1.5" />
        <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r="3" fill="#7b9ea8" stroke="white" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[10px] mt-1 px-1" style={{ color: "#b0b5bc" }}>
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
      <span className="text-xs w-10 flex-shrink-0" style={{ color: "#8f9399" }}>{label}</span>
      <div className="flex-1 rounded-full h-1" style={{ background: "#f0f1f3" }}>
        <div className="h-1 rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[11px] w-7 text-right" style={{ color: "#6b7280" }}>{value}%</span>
    </div>
  );
}

/* ── Neutral rank box ── */
function RankBox({ n }: { n: number }) {
  return (
    <span style={{
      fontSize: "11px", fontWeight: 500, width: "20px", height: "20px",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      border: "1px solid #d5d8dc", borderRadius: "4px", color: "#9ca3af",
    }}>{n}</span>
  );
}

function Growth({ v }: { v: number }) {
  if (v === 0) return <span style={{ fontSize: "11px", color: "#b0b5bc" }}>–</span>;
  const up = v > 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "2px",
      fontSize: "11px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px",
      background: up ? "#fff0f3" : "#f5f5f5",
      border: `1px solid ${up ? "#ffd6e0" : "#e8eaed"}`,
      color: up ? "#c4345a" : "#8f9399",
      lineHeight: 1, whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: "9px" }}>{up ? "▲" : "▼"}</span>
      {Math.abs(v)}%
    </span>
  );
}

export default function TrendTab({ onSeoNavigate, initialKeyword }: { onSeoNavigate?: (keyword: string) => void; initialKeyword?: string }) {
  const [keyword, setKeyword] = useState(initialKeyword || "");
  const [result, setResult] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [error, setError] = useState("");
  const [autoData, setAutoData] = useState<AutoResult | null>(null);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const autoSelectFired = useRef(false);

  useEffect(() => {
    if (loading) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  const resultRef = useRef<HTMLDivElement>(null);

  const loadHotKeywords = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) { _autoCache = null; _autoFetching = false; _phaseListeners = []; _finalListeners = []; }
    if (_autoCache && !forceRefresh) { setAutoData(_autoCache); return; }
    setLoadingAuto(true);
    await new Promise<void>((resolve) => {
      _phaseListeners.push((keywords, season) => {
        setAutoData({ mode: "auto", season, hotKeywords: keywords, updatedAt: "" });
        setLoadingAuto(false);
      });
      _finalListeners.push((result) => {
        setAutoData(result);
        setLoadingAuto(false);
        resolve();
      });
      _runAutoStream();
    });
  }, []);

  useEffect(() => { loadHotKeywords(); }, [loadHotKeywords]);

  // initialKeyword가 있으면 마운트 직후 자동 검색
  useEffect(() => {
    if (initialKeyword) handleSearch(initialKeyword);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async (kw?: string) => {
    const target = (kw ?? keyword).trim();
    if (!target) return;
    if (!kw) setKeyword(target);
    setLoading(true); setResult(null); setError(""); setAiStreaming(false);
    try {
      const res = await fetch("/api/naver-trend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: target }),
      });
      if (!res.ok || !res.body) { setError("오류가 발생했습니다."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.type === "error") { setError(obj.error); return; }
            if (obj.type === "naver") {
              setResult({ keyword: obj.keyword, trend: obj.trend, gender: obj.gender, age: obj.age, related: obj.related, aiAnalysis: null });
              setLoading(false);
            }
            if (obj.type === "ai_stream") { setAiStreaming(true); }
            if (obj.type === "ai") {
              setAiStreaming(false);
              setResult(prev => prev ? { ...prev, aiAnalysis: obj.aiAnalysis } : null);
            }
          } catch { /* 파싱 실패 */ }
        }
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false); setAiStreaming(false);
    }
  }, [keyword]);

  useEffect(() => {
    /* avg > 0 조건: fallback(Phase1) 데이터엔 반응 안 함 — Phase2 실데이터 올 때만 */
    if (autoData && autoData.hotKeywords.length > 0 && autoData.hotKeywords[0].avg > 0 && !result && !autoSelectFired.current) {
      autoSelectFired.current = true;
      const first = autoData.hotKeywords[0].keyword;
      setKeyword(first);
      handleSearch(first);
    }
  }, [autoData, result, handleSearch]);

  const verdictCfg = {
    good:    { dot: "#22c55e", chipBg: "#f0fdf4", chipBorder: "#bbf7d0", chipColor: "#15803d", label: "지금 팔기 좋음" },
    bad:     { dot: "#f87171", chipBg: "#fef2f2", chipBorder: "#fecaca", chipColor: "#b91c1c", label: "지금 팔기 어려움" },
    neutral: { dot: "#fbbf24", chipBg: "#fffbeb", chipBorder: "#fde68a", chipColor: "#b45309", label: "중립 — 준비 단계" },
  };

  return (
    /* ── 2-column: LEFT thin sidebar | CENTER main content ── */
    <div className="lg:grid" style={{ gridTemplateColumns: "200px 1fr", gap: "0 24px" }}>

      {/* ════ LEFT: Thin keyword sidebar ════ */}
      <div style={{ background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed" }}>
        {/* Sidebar header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" }}>
              🔥 급상승
            </p>
            {autoData && (
              <span style={{
                fontSize: "9px", fontWeight: 500, padding: "1px 6px", borderRadius: "8px",
                background: "#fde8ef", color: "#c4345a",
              }}>
                {autoData.season}
              </span>
            )}
          </div>
          <button
            onClick={() => loadHotKeywords(true)} disabled={loadingAuto}
            style={{
              fontSize: "10px", color: "#b0b5bc", background: "none", border: "none",
              cursor: "pointer", opacity: loadingAuto ? 0.5 : 1, padding: 0, flexShrink: 0,
            }}>
            {loadingAuto ? "..." : "↺"}
          </button>
        </div>

        {/* Loading skeleton */}
        {loadingAuto && (
          <div className="animate-pulse">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0", borderBottom: "1px solid #f0f1f3" }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "3px", background: "#e8eaed", flexShrink: 0 }} />
                <div style={{ flex: 1, height: "12px", borderRadius: "3px", background: "#e8eaed" }} />
                <div style={{ width: "28px", height: "11px", borderRadius: "3px", background: "#f0f1f3" }} />
              </div>
            ))}
          </div>
        )}

        {/* Keyword rows — 3-line layout: keyword / comment / score+growth */}
        {!loadingAuto && autoData && autoData.hotKeywords.length > 0 && (
          <div>
            {autoData.hotKeywords.map((hk, i) => (
              <button key={hk.keyword}
                onClick={() => { setKeyword(hk.keyword); handleSearch(hk.keyword); }}
                style={{
                  width: "100%", textAlign: "left",
                  display: "block",
                  padding: "10px 0", background: "none", border: "none",
                  borderBottom: i < autoData.hotKeywords.length - 1 ? "1px solid #f0f1f3" : "none",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                {/* 1줄: 순위 + 키워드 */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <RankBox n={i + 1} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>
                    {hk.keyword}
                  </span>
                </div>
                {/* 2줄: 한 줄 설명 */}
                <p style={{ fontSize: "11px", color: "#8f9399", lineHeight: 1.4, marginBottom: "4px", paddingLeft: "26px" }}>
                  {hk.comment}
                </p>
                {/* 3줄: 지수칩 + 증감칩 */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px", paddingLeft: "26px", flexWrap: "wrap" }}>
                  {hk.avg > 0 && (
                    <span style={{
                      fontSize: "10px", fontWeight: 500, padding: "2px 6px", borderRadius: "5px",
                      background: "#f5f5f5", border: "1px solid #e8eaed", color: "#8f9399",
                    }}>
                      {hk.avg}
                    </span>
                  )}
                  {hk.growth !== 0 && <Growth v={hk.growth} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {!loadingAuto && !autoData && (
          <p style={{ fontSize: "11px", color: "#9ca3af", paddingTop: "8px" }}>
            불러오지 못했습니다.
          </p>
        )}
      </div>

      {/* ════ CENTER: Main content ════ */}
      <div ref={resultCardRef}>
        {/* Section heading */}
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "6px" }}>
          TREND ANALYZER
        </p>
        <h1 style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: "4px" }}>
          지금 뭐가<br />팔려?
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px", lineHeight: 1.6 }}>
          AI가 "지금 팔리는 키워드"를 분석합니다
        </p>

        {/* Search card */}
        <div style={CARD} className="p-5">
          <div className="mb-4">
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "3px" }}>직접 검색</p>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e", marginBottom: "2px" }}>키워드 트렌드 분석</h2>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>검색하고 싶은 키워드를 직접 입력하세요</p>
          </div>

          {/* Search input */}
          <div className="flex gap-2 mb-4">
            <input type="text" value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="예) 아로니아, 무선 이어폰, 여름 원피스"
              style={{
                flex: 1, fontSize: "13px", borderRadius: "8px", padding: "10px 14px",
                outline: "none", background: "#f7f8fa", border: "1px solid #e8eaed",
                color: "#1a1a2e",
              }} />
            <button onClick={() => handleSearch()} disabled={loading || !keyword.trim()}
              style={{
                padding: "10px 16px", borderRadius: "8px", border: "none",
                background: "#ef567c", color: "#fff", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", flexShrink: 0,
                opacity: loading || !keyword.trim() ? 0.45 : 1,
              }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />분석
                  </span>
                : "🔍 분석"}
            </button>
          </div>

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: "8px",
              background: "#fff1f0", border: "1px solid #fca5a5", fontSize: "13px", color: "#dc2626",
            }}>{error}</div>
          )}

          {loading && (
            <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <span className="w-7 h-7 rounded-full animate-spin" style={{
                borderWidth: "2.5px", borderStyle: "solid", borderColor: "#e8eaed", borderTopColor: "#ef567c",
              }} />
              <p style={{ fontSize: "13px", color: "#4a4f57" }}>AI가 분석 중입니다...</p>
              <p style={{ fontSize: "11px", color: "#9ca3af" }}>네이버 실시간 데이터 수집 중...</p>
            </div>
          )}
        </div>

        {/* ── Results card ── */}
        {result && !loading && (
          <div ref={resultRef} style={{ ...CARD, marginTop: "12px" }} className="p-5">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Verdict pill */}
            {result.aiAnalysis ? (
              result.aiAnalysis.verdict && (() => {
                const cfg = verdictCfg[result.aiAnalysis!.verdict];
                return (
                  <div style={{ padding: "12px 14px", borderRadius: "8px", background: "white", border: "1px solid #e8eaed" }}>
                    {/* Frill 칩: 옅은 파스텔 배경 + 같은 계열 border + 앞에 점 */}
                    <div style={{ marginBottom: "10px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        fontSize: "11px", fontWeight: 500, padding: "3px 8px", borderRadius: "6px",
                        background: cfg.chipBg, border: `1px solid ${cfg.chipBorder}`, color: cfg.chipColor,
                      }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                      ⚡ {result.aiAnalysis!.action_command}
                    </p>
                    <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>{result.aiAnalysis!.reason}</p>
                  </div>
                );
              })()
            ) : (
              <div style={{ padding: "12px 14px", borderRadius: "8px", background: "#f7f8fa", border: "1px solid #e8eaed" }}>
                {aiStreaming ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>AI 판매 분석 작성 중</span>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full animate-bounce"
                        style={{ background: "#9ca3af", animationDelay: `${i * 0.18}s` }} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>⏳ AI 판매 분석 중...</p>
                )}
              </div>
            )}

            {/* Inline metrics */}
            {result.trend.ratios.length > 0 && (
              <div style={{ display: "flex", gap: "24px" }}>
                {[
                  { label: "검색 피크", value: String(Math.max(...result.trend.ratios)) },
                  { label: "연관 키워드", value: String(result.related.length) },
                  { label: "AI 판정", value: result.aiAnalysis?.verdict === "good" ? "🟢" : result.aiAnalysis?.verdict === "bad" ? "🔴" : "🟡" },
                ].map(m => (
                  <div key={m.label}>
                    <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{m.label}</p>
                    <p style={{ fontSize: "17px", fontWeight: 600, color: "#1a1a2e" }}>{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Trend chart */}
            {result.trend.ratios.length > 0 && (
              <div>
                <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                  최근 30일 트렌드&nbsp;<span style={{ textTransform: "none", color: "#4a4f57" }}>"{result.keyword}"</span>
                </p>
                <LineChart dates={result.trend.dates} ratios={result.trend.ratios} />
              </div>
            )}

            {/* Related keywords — divider rows */}
            {result.related.length > 0 && (
              <div>
                <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  급상승 연관 키워드 TOP {result.related.length}
                </p>
                <div>
                  {result.related.map((r, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "9px 0",
                      borderBottom: i < result.related.length - 1 ? "1px solid #f0f1f3" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <RankBox n={i + 1} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a2e" }}>{r.keyword}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", color: "#8f9399" }}>{r.avg}</span>
                        <Growth v={r.growth} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gender / Age — calm two tones */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>성별 비율</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <BarRow label="남성" value={result.gender.male_pct} color="#7b9ea8" />
                  <BarRow label="여성" value={result.gender.female_pct} color="#b89fbe" />
                </div>
              </div>
              <div>
                <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>연령대</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {Object.entries(result.age).map(([label, val]) => (
                    <BarRow key={label} label={label} value={val} color="#8fa0b0" />
                  ))}
                </div>
              </div>
            </div>

            {/* Action plan */}
            {result.aiAnalysis === null ? (
              <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ display: "flex", gap: "10px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#e8eaed", flexShrink: 0 }} />
                    <div style={{ flex: 1, height: "13px", borderRadius: "4px", background: "#e8eaed" }} />
                  </div>
                ))}
              </div>
            ) : result.aiAnalysis?.tips?.length > 0 && (
              <div>
                <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>실행 액션 플랜</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {result.aiAnalysis.tips.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                      <span style={{
                        fontSize: "10px", width: "20px", height: "20px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "#f0f1f3", color: "#6b7280", borderRadius: "4px",
                        flexShrink: 0, marginTop: "1px",
                      }}>{i + 1}</span>
                      <p style={{ fontSize: "13px", color: "#4a4f57", lineHeight: 1.55 }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA → SEO */}
            {onSeoNavigate && (
              <button onClick={() => onSeoNavigate(result.keyword)}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: "8px",
                  border: "1px solid #e8eaed", background: "#f7f8fa",
                  color: "#4a4f57", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                }}>
                📈 이 키워드로 상품명 만들기
              </button>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
