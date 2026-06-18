"use client";

import { useState, useRef } from "react";
import PolicyFilter from "@/components/PolicyFilter";
import { useStream } from "@/lib/useStream";

interface Keyword {
  keyword: string; type: string;
  estimated_cpc_range?: string;
  break_even_limit?: string;
  break_even_limit_meta?: string;
  estimated_cpc?: string;
  bid_amount?: string;
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
  border: "1px solid #e8eaed",
};
const inputCls = "w-full text-sm rounded-lg px-4 py-3 outline-none transition-all placeholder:text-gray-400 text-[#1a1a1a]";
const inputStyle: React.CSSProperties = { background: "#f9fafb", border: "1px solid #e8eaed" };
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const labelStyle: React.CSSProperties = { color: "#9ca3af" };

function SkeletonResult() {
  return (
    <div className="mt-5 space-y-3 animate-pulse">
      <div className="h-14 rounded-xl" style={{ background: "#f0f0f0" }} />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl" style={{ background: "#f7f8fa" }} />)}
      </div>
      <div className="h-6 rounded-lg w-1/3" style={{ background: "#f0f0f0" }} />
      {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: "#f7f8fa" }} />)}
      <div className="h-28 rounded-xl" style={{ background: "#f7f8fa" }} />
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>{label}</p>
      <p className="font-extrabold text-lg leading-none" style={{ color: color || "#1a1a1a" }}>{value}</p>
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
  const submitting = useRef(false);
  const [cpcData, setCpcData] = useState<{ monthlySearch: number; pcCpc: number | null; mobileCpc: number | null; competition: number | null } | null>(null);
  const [cpcLoading, setCpcLoading] = useState(false);
  const { streaming, readStream } = useStream();

  const handleSubmit = async () => {
    if (!productName || submitting.current) return;
    submitting.current = true;
    setLoading(true); setResult(null); setError(""); setCpcData(null);

    // 1. 실측 CPC 먼저 조회 — AI 프롬프트 주입용
    setCpcLoading(true);
    let realCpcData = null;
    try {
      const res = await fetch("/api/searchad-cpc", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: productName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) { realCpcData = data; setCpcData(data); }
      }
    } catch { /* 실측 없어도 진행 */ }
    finally { setCpcLoading(false); }

    // 2. 실측값을 포함해 AI 전략 요청
    try {
      const res = await fetch("/api/bidding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, dailyBudget, sellingPrice, cpcData: realCpcData }),
      });
      await readStream(res, (text) => {
        try {
          const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          // 첫 번째 완전한 JSON 객체만 추출 (그리디 정규식의 이중 파싱 방지)
          let depth = 0, start = -1, parsed = null;
          for (let i = 0; i < clean.length; i++) {
            if (clean[i] === "{") { if (depth === 0) start = i; depth++; }
            else if (clean[i] === "}") {
              depth--;
              if (depth === 0 && start !== -1) {
                try { parsed = JSON.parse(clean.slice(start, i + 1)); break; }
                catch { start = -1; }
              }
            }
          }
          if (!parsed) throw new Error("No JSON");
          setResult(parsed as BiddingResult);
        } catch { setError("분석 결과를 불러오지 못했습니다. 다시 시도해주세요."); }
      }, () => setError("오류가 발생했습니다. 다시 시도해주세요."));
    } catch { setError("오류가 발생했습니다. 다시 시도해주세요."); }
    finally { submitting.current = false; setLoading(false); }
  };

  /* 칩 스타일 함수 — Frill 파스텔 박스 칩 */
  const competitionChip = (c: string): React.CSSProperties =>
    c === "높음" ? { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }
    : c === "중간" ? { background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309" }
    : { background: "#f9fafb", border: "1px solid #e8eaed", color: "#6b7280" };

  const typeChip = (t: string): React.CSSProperties =>
    t === "대형" ? { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }
    : t === "중형" ? { background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c" }
    : { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" };

  return (
    <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* ── LEFT: Hero sidebar ── */}
      <div className="mb-6 lg:mb-0" style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
          AD STRATEGY
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>
          광고 대행사 없이, AI가 대신
        </p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>
          적은 예산으로 상단 노출
        </p>
        {["소규모 예산 최적화", "AI 추정 입찰가 제안", "단계별 광고 로드맵"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", color: "#c0c4cc", flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: "13px", color: "#8f9399" }}>{f}</span>
          </div>
        ))}

        {/* Budget allocation - compact */}
        {result?.budget_allocation && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>예산 배분</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, padding: "8px", background: "#f9fafb", border: "1px solid #e8eaed", borderRadius: "6px", textAlign: "center" }}>
                <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px" }}>소형</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>{result.budget_allocation.small_keywords}%</p>
              </div>
              <div style={{ flex: 1, padding: "8px", background: "#f9fafb", border: "1px solid #e8eaed", borderRadius: "6px", textAlign: "center" }}>
                <p style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px" }}>중형</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>{result.budget_allocation.medium_keywords}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Card ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: "1232px", margin: "0 auto" }}>
      <div style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>전략 생성</p>
          <h2 className="font-bold text-xl" style={{ color: "#111827" }}>키워드 입찰 전략</h2>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>상품 정보를 입력하면 AI가 최적 전략을 만듭니다</p>
        </div>

        {/* Form */}
        <div className="space-y-3.5">
          <div>
            <label className={labelCls} style={labelStyle}>상품명 <span className="text-red-400 normal-case">*</span></label>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="예) 무선 블루투스 이어폰" className={inputCls} style={inputStyle} />
            {/* 실제 CPC 표시 */}
            {cpcLoading && (
              <p className="text-[11px] mt-1.5" style={{ color: "#9ca3af" }}>실제 CPC 조회 중...</p>
            )}
            {cpcData && !cpcLoading && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: "#e8f5f0", color: "#00aa6c" }}>
                  월 검색수 {cpcData.monthlySearch.toLocaleString()}회
                </span>
                {cpcData.pcCpc !== null && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: "#fff8ed", color: "#f59e0b" }}>
                    PC CPC {cpcData.pcCpc}
                  </span>
                )}
                {cpcData.mobileCpc !== null && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: "#f0f4f3", color: "#1a1a1a" }}>
                    모바일 CPC {cpcData.mobileCpc}
                  </span>
                )}
                <span className="text-[10px]" style={{ color: "#9ca3af" }}>네이버 SearchAd 실측</span>
              </div>
            )}
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
            style={{ background: "#ef567c" }}>
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
              <div className="rounded-xl p-4 border-l-4" style={{ background: "#fafafa", borderColor: "#d5d8dc" }}>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "#64676b" }}>⚡ 오늘 광고 관리자에서 바로 실행</p>
                <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>{result.today_action}</p>
              </div>
            )}

            {/* 3 metrics */}
            {result.keywords?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <MetricCard label="추천 키워드" value={String(result.keywords.filter(k => k.recommended).length)} sub="개" color="#ef567c" />
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
                    style={{ background: "white", border: "1px solid #e8eaed" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {kw.recommended && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ background: "#f5f3ff", border: "1px solid #ede9fe", color: "#6d28d9" }}>추천</span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                          style={typeChip(kw.type)}>{kw.type}</span>
                        <span className="font-bold text-sm" style={{ color: "#1a1a1a" }}>{kw.keyword}</span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={competitionChip(kw.competition)}>
                        경쟁 {kw.competition}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {kw.estimated_cpc_range ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: "#f7f8fa", border: "1px solid #e8eaed", color: "#4a4f57" }}>
                          예상 CPC {kw.estimated_cpc_range}
                          <span className="ml-1 font-normal text-[10px]"
                            style={{ color: cpcData ? "#047857" : "#9ca3af" }}>
                            {cpcData ? "실측 참고" : "AI 추정"}
                          </span>
                        </span>
                      ) : kw.estimated_cpc ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ background: "#f7f8fa", border: "1px solid #e8eaed", color: "#4a4f57" }}>
                          예상 CPC {kw.estimated_cpc}원
                          <span className="ml-1 text-[10px]" style={{ color: "#9ca3af" }}>AI 추정값</span>
                        </span>
                      ) : null}
                      {kw.break_even_limit && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
                          손익분기 상한 {kw.break_even_limit}
                        </span>
                      )}
                    </div>
                    {kw.break_even_limit_meta && (
                      <p className="text-[10px] mb-2" style={{ color: "#9ca3af" }}>{kw.break_even_limit_meta}</p>
                    )}
                    {kw.bid_command && (
                      <div className="rounded-lg px-3 py-2" style={{ background: "#f7f8fa", border: "1px solid #e8eaed" }}>
                        <p className="text-sm font-medium" style={{ color: "#4a4f57" }}>👉 {kw.bid_command}</p>
                      </div>
                    )}
                    <p className="text-sm mt-2 leading-[1.75]" style={{ color: "#4b5563" }}>{kw.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget allocation - mobile only (desktop shows in hero col) */}
            {result.budget_allocation && (
              <div className="lg:hidden rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>예산 배분 전략</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: "#f7f8fa", border: "1px solid #e8eaed" }}>
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>소형 키워드</p>
                    <p className="font-extrabold text-2xl" style={{ color: "#1a1a1a" }}>{result.budget_allocation.small_keywords}%</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                    <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>중형 키워드</p>
                    <p className="font-extrabold text-2xl" style={{ color: "#1a1a1a" }}>{result.budget_allocation.medium_keywords}%</p>
                  </div>
                </div>
                <p className="text-sm leading-[1.75]" style={{ color: "#4b5563" }}>{result.budget_allocation.reason}</p>
              </div>
            )}

            {/* Phase strategy */}
            {result.strategy && (
              <div className="rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>단계별 광고 전략</p>
                <div className="space-y-2.5">
                  {[
                    { label: "1~2주차", chip: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" } as React.CSSProperties, content: result.strategy.phase1 },
                    { label: "3~4주차", chip: { background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309" } as React.CSSProperties, content: result.strategy.phase2 },
                    { label: "2개월+",  chip: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" } as React.CSSProperties, content: result.strategy.phase3 },
                  ].map((p, i) => (
                    <div key={i} className="flex gap-2.5 rounded-lg p-2.5" style={{ background: "white", border: "1px solid #f0f1f3" }}>
                      <span className="text-[10px] font-medium px-2 py-1 rounded-md flex-shrink-0 h-fit"
                        style={p.chip}>{p.label}</span>
                      <p className="text-sm leading-[1.75]" style={{ color: "#4b5563" }}>{p.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ROI - mobile only */}
            {result.roi_estimate && (
              <div className="lg:hidden rounded-xl p-4" style={{ background: "#f7f8fa", border: "1px solid #e8eaed" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>예상 광고 ROI</p>
                <p className="text-sm" style={{ color: "#1a1a1a" }}>{result.roi_estimate}</p>
              </div>
            )}

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #e8eaed" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>광고 운영 팁</p>
                <div className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>•</span>
                      <p className="text-sm leading-[1.75]" style={{ color: "#4b5563" }}>{tip}</p>
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
      </div>
    </div>
  );
}
