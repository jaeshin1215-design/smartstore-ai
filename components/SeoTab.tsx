"use client";

import { useState, useEffect, useRef } from "react";
import PolicyFilter from "@/components/PolicyFilter";

interface OptimizedName { name: string; reason: string; keywords_used: string[] }
interface KeywordStrategy { main_keyword: string; sub_keywords: string[]; recommendation: string }
interface SeoResult {
  action_command?: string;
  score?: { current: string; issues: string[] };
  optimized_names: OptimizedName[];
  keyword_strategy?: KeywordStrategy;
  seo_tips: string[];
  avoid: string[];
}
interface Phase2Buffer { keyword_strategy?: KeywordStrategy; seo_tips: string[]; avoid: string[] }

const inputStyle: React.CSSProperties = {
  width: "100%", fontSize: "14px", borderRadius: "8px", padding: "11px 16px",
  outline: "none", background: "#f7f8fa", border: "1px solid #e8eaed",
  color: "#1a1a1a", fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "5px",
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ height: "4px", borderRadius: "2px", background: "#f0f1f3", marginTop: "6px" }}>
      <div style={{ height: "4px", borderRadius: "2px", transition: "width 0.7s", width: `${Math.min(score, 100)}%`, background: color }} />
    </div>
  );
}

/* Strategy badge system — all pastel, differentiated by hue only */
const STRATEGY_BADGE: Record<number, { bg: string; color: string; label: string }> = {
  0: { bg: "#fff1f0", color: "#b94040", label: "공격형" },
  1: { bg: "#f5f5f5", color: "#4a4f57", label: "균형형" },
  2: { bg: "#eff6ff", color: "#1a56b0", label: "안전형" },
};

export default function SeoTab({ initialKeyword }: { initialKeyword?: string }) {
  const [productName, setProductName] = useState(initialKeyword ?? "");
  const autoSubmitted = useRef(false);
  const prevInitialKeyword = useRef<string | undefined>(undefined);
  const submitting = useRef(false); /* atomic guard — React state보다 먼저 체크 */
  /* phase2가 phase1보다 먼저 도착할 때 버퍼 */
  const phase2Buffer = useRef<unknown>(null);

  useEffect(() => {
    if (initialKeyword && initialKeyword !== prevInitialKeyword.current) {
      prevInitialKeyword.current = initialKeyword;
      setProductName(initialKeyword);
      autoSubmitted.current = false;
    }
  }, [initialKeyword]);

  useEffect(() => {
    if (initialKeyword && productName === initialKeyword && !autoSubmitted.current) {
      autoSubmitted.current = true;
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName, initialKeyword]);

  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [searchVolume, setSearchVolume] = useState("");
  const [competitorCount, setCompetitorCount] = useState("");
  const [clickRate, setClickRate] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [showItemscout, setShowItemscout] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendData, setTrendData] = useState<{ avgRatio: number; growth: number } | null>(null);
  const [relatedKeywords, setRelatedKeywords] = useState<{ keyword: string; avg: number; growth: number }[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [productCountLoading, setProductCountLoading] = useState(false);
  const [competitionRatio, setCompetitionRatio] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const handleSubmit = async () => {
    if (!productName || submitting.current) return;
    submitting.current = true;
    phase2Buffer.current = null; /* 이전 버퍼 초기화 */
    setLoading(true); setResult(null); setError(""); setStreaming(false);
    setTrendData(null); setRelatedKeywords([]); setProductCount(null); setCompetitionRatio(null);

    // ① 연관 키워드 조회 (fire & forget)
    setRelatedLoading(true);
    void (async () => {
      try {
        const tr = await fetch("/api/naver-trend", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: productName }),
        });
        if (!tr.ok || !tr.body) return;
        const reader = tr.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.type === "naver" && Array.isArray(obj.related) && obj.related.length) {
                setRelatedKeywords(obj.related.slice(0, 5));
                setRelatedLoading(false);
                reader.cancel();
                return;
              }
            } catch { /* skip */ }
          }
        }
      } catch { /* 실패해도 SEO 진행 */ }
      finally { setRelatedLoading(false); }
    })();

    // ② 상품수 조회
    setProductCountLoading(true);
    void (async () => {
      try {
        const pc = await fetch("/api/product-count", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: productName }),
        });
        if (pc.ok) {
          const pcData = await pc.json();
          const total: number = pcData.total ?? 0;
          setProductCount(total);
          setCompetitorCount(String(total));
        }
      } catch { /* 실패해도 진행 */ }
      finally { setProductCountLoading(false); }
    })();

    // ③ DataLab 검색량
    setTrendLoading(true);
    let autoSearchVolume = searchVolume;
    try {
      const tvRes = await fetch("/api/search-volume", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: productName }),
      });
      if (tvRes.ok) {
        const tv = await tvRes.json();
        if (tv.avgRatio !== undefined) {
          setTrendData({ avgRatio: tv.avgRatio, growth: tv.growth });
          if (!searchVolume) autoSearchVolume = `검색지수 ${tv.avgRatio} (전주대비 ${tv.growth > 0 ? "+" : ""}${tv.growth}%)`;
        }
      }
    } catch { /* 실패해도 SEO 진행 */ }
    setTrendLoading(false);

    try {
      const res = await fetch("/api/seo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, keywords, searchVolume: autoSearchVolume, competitorCount, clickRate, priceRange }),
      });
      /* setLoading(false)를 여기서 제거 — streaming 시작 전 false가 되면 guard 뚫림 */
      if (!res.ok || !res.body) { setLoading(false); setError("오류가 발생했습니다."); return; }

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
            if (obj.type === "seo_stream") { setStreaming(true); }
            if (obj.type === "seo_phase1") {
              const buf = phase2Buffer.current;
              phase2Buffer.current = null;
              setStreaming(false);
              const base: SeoResult = {
                action_command: obj.action_command,
                score: obj.score,
                optimized_names: obj.optimized_names ?? [],
                seo_tips: [],
                avoid: [],
              };
              if (buf) {
                const b = buf as Phase2Buffer;
                base.keyword_strategy = b.keyword_strategy;
                base.seo_tips = b.seo_tips;
                base.avoid = b.avoid;
              }
              setResult(base);
            }
            if (obj.type === "seo_phase2") {
              setResult(prev => {
                if (!prev) {
                  /* phase1보다 먼저 도착 — 버퍼에 보관 */
                  phase2Buffer.current = {
                    keyword_strategy: obj.keyword_strategy,
                    seo_tips: obj.seo_tips ?? [],
                    avoid: obj.avoid ?? [],
                  };
                  return null;
                }
                return {
                  ...prev,
                  keyword_strategy: obj.keyword_strategy,
                  seo_tips: obj.seo_tips ?? [],
                  avoid: obj.avoid ?? [],
                };
              });
            }
            if (obj.type === "error") { setStreaming(false); setError(obj.error); }
          } catch { /* 파싱 실패 무시 */ }
        }
      }
    } catch { setError("오류가 발생했습니다. 다시 시도해주세요."); }
    finally {
      submitting.current = false;
      setLoading(false); setStreaming(false);
    }
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

  return (
    /* ── 2-column: LEFT heading+bullets+score | CENTER form+results ── */
    <div className="lg:grid" style={{ gridTemplateColumns: "200px minmax(0, 720px)", gap: "0 25vw" }}>

      {/* ════ LEFT: Section heading + feature bullets + score ════ */}
      <div style={{ background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
          SEO OPTIMIZER
        </p>
        <h2 style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: "8px" }}>
          검색 1페이지<br />올리기
        </h2>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "20px", lineHeight: 1.6 }}>
          상품명 하나로 노출이 10배 달라집니다.<br />AI가 최적의 상품명을 만들어드려요.
        </p>

        {["네이버 검색 알고리즘 최적화", "경쟁사 키워드 전략 분석", "상품명 3가지 버전 제공"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>✓</span>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>{f}</span>
          </div>
        ))}

        {result?.score && (
          <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div style={{ padding: "10px 12px", border: "1px solid #e8eaed", borderRadius: "6px", background: "white" }}>
              <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>현재 점수</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>{result.score.current}점</p>
              <ScoreBar score={currentScore} color="#9ca3af" />
            </div>
            <div style={{ padding: "10px 12px", border: "1px solid #e8eaed", borderRadius: "6px", background: "white" }}>
              <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>예상 개선</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#ef567c" }}>{improvedScore}점</p>
              <ScoreBar score={improvedScore} color="#ef567c" />
            </div>
          </div>
        )}
      </div>

      {/* ════ CENTER: Form card + Results card ════ */}
      <div>
        {/* Form card */}
        <div style={{ background: "#ffffff", border: "1px solid #e8eaed", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "3px" }}>분석 입력</p>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "2px" }}>상품명 SEO 최적화</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>현재 상품명을 입력하면 AI가 분석합니다</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>현재 상품명 <span style={{ color: "#ef567c", textTransform: "none", fontWeight: 600 }}>*</span></label>
              <input type="text" value={productName}
                onChange={e => setProductName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="예) 제습제 무향 450ml 4개입"
                style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>카테고리</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                  placeholder="예) 생활용품 > 제습제" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>핵심 키워드</label>
                <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                  placeholder="예) 제습제, 습기제거, 옷장용" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>
                  월 검색량
                  {trendLoading && <span style={{ color: "#b0b5bc", marginLeft: "6px", fontWeight: 400, textTransform: "none" }}>조회 중...</span>}
                  {trendData && !trendLoading && <span style={{ color: "#8f9399", marginLeft: "6px", fontWeight: 400, textTransform: "none" }}>지수 {trendData.avgRatio}</span>}
                </label>
                <input type="text" value={searchVolume} onChange={e => setSearchVolume(e.target.value)}
                  placeholder="자동 조회됨" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>
                  경쟁 상품수
                  {productCountLoading && <span style={{ color: "#b0b5bc", marginLeft: "6px", fontWeight: 400, textTransform: "none" }}>조회 중...</span>}
                  {productCount !== null && !productCountLoading && <span style={{ color: "#8f9399", marginLeft: "6px", fontWeight: 400, textTransform: "none" }}>{productCount.toLocaleString()}개</span>}
                </label>
                <input type="text" value={competitorCount} onChange={e => setCompetitorCount(e.target.value)}
                  placeholder="자동 조회됨" style={inputStyle} />
              </div>
            </div>

            <button onClick={() => setShowItemscout(v => !v)}
              style={{ fontSize: "12px", color: "#8f9399", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
              {showItemscout ? "▾" : "▸"} 아이템스카우트 고급 입력 (선택)
            </button>
            {showItemscout && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px 14px", background: "#f7f8fa", borderRadius: "8px" }}>
                <div>
                  <label style={labelStyle}>클릭률 (CTR)</label>
                  <input type="text" value={clickRate} onChange={e => setClickRate(e.target.value)} placeholder="예) 3.2%" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>판매가 범위</label>
                  <input type="text" value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="예) 8000~15000" style={inputStyle} />
                </div>
              </div>
            )}

            {(relatedLoading || relatedKeywords.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>연관:</span>
                {relatedLoading && <span style={{ fontSize: "11px", color: "#b0b5bc" }}>조회 중...</span>}
                {relatedKeywords.map(rk => (
                  <button key={rk.keyword}
                    onClick={() => setKeywords(prev => prev ? `${prev}, ${rk.keyword}` : rk.keyword)}
                    style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", border: "1px solid #e8eaed", background: "#f7f8fa", color: "#4a4f57", cursor: "pointer" }}>
                    + {rk.keyword}
                  </button>
                ))}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || streaming || !productName}
              style={{
                width: "100%", padding: "13px 0", borderRadius: "8px", border: "none",
                background: "#ef567c", color: "#fff", fontSize: "14px", fontWeight: 600,
                cursor: "pointer", opacity: loading || streaming || !productName ? 0.45 : 1, marginTop: "4px",
              }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />연결 중...
                  </span>
                : "✨ 상품명 최적화하기"}
            </button>
          </div>

          {streaming && (
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>AI 상품명 분석 작성 중</span>
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: "#9ca3af", animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          )}
          {error && !streaming && (
            <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "8px", background: "#fff1f0", border: "1px solid #fca5a5", fontSize: "13px", color: "#dc2626" }}>{error}</div>
          )}
        </div>

        {/* Results card */}
        {result && !streaming && (
          <div ref={resultRef} style={{ background: "#ffffff", border: "1px solid #e8eaed", borderRadius: "8px", padding: "20px", marginTop: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {result.action_command && (
                <div style={{ padding: "12px 14px", borderRadius: "8px", background: "#fafafa", borderLeft: "3px solid #d5d8dc" }}>
                  <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>⚡ 지금 바로 실행하세요</p>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{result.action_command}</p>
                </div>
              )}

              {result.score?.issues && result.score.issues.length > 0 && (
                <div>
                  <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>현재 상품명 문제</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {result.score.issues.map((issue, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>✕</span>
                        <p style={{ fontSize: "13px", color: "#4a4f57" }}>{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.optimized_names?.slice(0, 3).length > 0 && (
                <div>
                  <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>추천 상품명 (최대 3개)</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {result.optimized_names.slice(0, 3).map((item, i) => {
                      const badge = STRATEGY_BADGE[i] ?? STRATEGY_BADGE[2];
                      return (
                        <div key={i} style={{ padding: "14px 16px", border: "1px solid #e8eaed", borderRadius: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "10px", background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                            <button onClick={() => handleCopy(item.name, i)}
                              style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", border: "1px solid #e8eaed", background: "#f7f8fa", color: "#6b7280", cursor: "pointer" }}>
                              {copied === i ? "✓ 복사됨" : "복사"}
                            </button>
                          </div>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px", lineHeight: 1.4 }}>{item.name}</p>
                          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>{item.reason}</p>
                          {item.keywords_used?.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {item.keywords_used.map((kw, j) => (
                                <span key={j} style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "8px", background: "#f5f5f5", color: "#8f9399" }}>#{kw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.keyword_strategy && (
                <div>
                  <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>키워드 전략</p>
                  <div style={{ padding: "12px 14px", border: "1px solid #e8eaed", borderRadius: "8px" }}>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      메인: <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{result.keyword_strategy.main_keyword}</span>
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                      {result.keyword_strategy.sub_keywords?.map((kw, i) => (
                        <span key={i} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", border: "1px solid #e8eaed", background: "#f7f8fa", color: "#4a4f57" }}>{kw}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>{result.keyword_strategy.recommendation}</p>
                  </div>
                </div>
              )}

              {result.seo_tips?.length > 0 && (
                <div>
                  <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>SEO 개선 팁</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {result.seo_tips.map((tip, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "10px", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f1f3", color: "#6b7280", borderRadius: "4px", flexShrink: 0, marginTop: "1px" }}>{i + 1}</span>
                        <p style={{ fontSize: "13px", color: "#4a4f57", lineHeight: 1.55 }}>{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.avoid?.length > 0 && (
                <div>
                  <p style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>피해야 할 표현</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {result.avoid.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>✕</span>
                        <p style={{ fontSize: "13px", color: "#4a4f57" }}>{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>✓</span>
                <span style={{ fontSize: "12px", color: "#8f9399" }}>네이버 정책 검토 완료</span>
                <PolicyFilter text={[...(result.optimized_names?.map(n => n.name) ?? []), ...(result.seo_tips ?? [])].join(" ")} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
