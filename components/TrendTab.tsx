"use client";

import { useState } from "react";

interface TrendKeyword {
  keyword: string;
  reason: string;
  competition: string;
  opportunity: number;
  action: string;
}
interface HotProduct {
  product: string;
  why_now: string;
  target: string;
  price_range: string;
}
interface SeasonStrategy {
  this_month: string;
  next_month: string;
  avoid: string;
}
interface EventOpportunity {
  event: string;
  product_idea: string;
  timing: string;
  copy: string;
}
interface TrendResult {
  summary: string;
  trend_keywords: TrendKeyword[];
  hot_products: HotProduct[];
  season_strategy: SeasonStrategy;
  event_opportunities: EventOpportunity[];
  competitor_alert: string;
  action_checklist: string[];
}
interface TrendMeta {
  date: string;
  season: string;
  events: string[];
}

const CATEGORIES = [
  "식품 > 건강식품", "식품 > 간식/음료", "식품 > 신선식품",
  "의류 > 여성패션", "의류 > 남성패션", "의류 > 아동복",
  "뷰티 > 스킨케어", "뷰티 > 헤어케어", "뷰티 > 메이크업",
  "생활 > 주방용품", "생활 > 인테리어", "생활 > 청소/세탁",
  "디지털 > 이어폰/헤드폰", "디지털 > 스마트기기", "가전 > 생활가전",
  "스포츠 > 운동용품", "스포츠 > 아웃도어", "유아 > 완구/교육",
  "반려동물 > 사료/간식", "반려동물 > 용품"
];

export default function TrendTab() {
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [manualData, setManualData] = useState("");
  const [result, setResult] = useState<TrendResult | null>(null);
  const [meta, setMeta] = useState<TrendMeta | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!category) return;
    setLoading(true);
    setResult(null);
    setMeta(null);
    try {
      const res = await fetch("/api/trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subCategory, keywords, manualData }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setMeta(data.meta);
      }
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const opportunityColor = (score: number) =>
    score >= 8 ? "#e74c3c" : score >= 6 ? "#f39c12" : "#2ecc71";

  const competitionBg = (c: string) =>
    c === "높음" ? "#fee2e2" : c === "중간" ? "#fef3c7" : "#d1fae5";

  const competitionColor = (c: string) =>
    c === "높음" ? "#e74c3c" : c === "중간" ? "#f39c12" : "#2ecc71";

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>📊 트렌드 리포트</h2>
      <p className="text-gray-400 text-sm mb-6">카테고리별 급상승 키워드와 신상품 트렌드를 실시간 분석해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리 <span className="text-red-400">*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors bg-white">
            <option value="">카테고리 선택</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>세부 카테고리 / 관심 상품 (선택)</label>
          <input type="text" value={subCategory} onChange={(e) => setSubCategory(e.target.value)}
            placeholder="예) 저당 단백질 식품, 온풍기, 가습기"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>관심 키워드 (선택)</label>
          <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
            placeholder="예) 유기농, 저칼로리, 무타공"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
            아이템스카우트 / 네이버 데이터랩 데이터 (선택)
          </label>
          <textarea value={manualData} onChange={(e) => setManualData(e.target.value)}
            placeholder={"예) 아이템스카우트에서 확인한 내용:\n- '무타공 온풍기' 월간 검색량 8,200\n- '욕실 온풍기' 경쟁 상품 1,200개\n- 최근 30일 상승률 +42%"}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors resize-none" />
          <p className="text-xs text-gray-400 mt-1">💡 데이터를 입력할수록 더 정확한 트렌드 분석이 가능해요</p>
        </div>

        <button onClick={handleSubmit} disabled={loading || !category}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              트렌드 분석 중...
            </span>
          ) : "📊 트렌드 리포트 생성하기"}
        </button>
      </div>

      {result && meta && (
        <div className="mt-6 space-y-4">
          {/* 리포트 헤더 */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/70">{meta.date} {meta.season} 시즌 트렌드 리포트</p>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{category}</span>
            </div>
            <p className="text-sm font-bold text-white mb-2">{result.summary}</p>
            {meta.events?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {meta.events.map((e, i) => (
                  <span key={i} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{e}</span>
                ))}
              </div>
            )}
          </div>

          {/* 급상승 키워드 */}
          {result.trend_keywords?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🔥 급상승 키워드</p>
              <div className="space-y-3">
                {result.trend_keywords.map((kw, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: "#1a1a2e" }}>#{kw.keyword}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: competitionBg(kw.competition), color: competitionColor(kw.competition) }}>
                          경쟁 {kw.competition}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">기회</span>
                        <span className="text-sm font-bold" style={{ color: opportunityColor(kw.opportunity) }}>
                          {kw.opportunity}/10
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{kw.reason}</p>
                    <div className="bg-indigo-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-indigo-700">👉 {kw.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 주목할 상품 */}
          {result.hot_products?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🛍️ 지금 팔면 좋은 상품</p>
              <div className="space-y-2">
                {result.hot_products.map((p, i) => (
                  <div key={i} className="bg-orange-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-orange-800">{p.product}</p>
                      <span className="text-xs text-orange-500">{p.price_range}</span>
                    </div>
                    <p className="text-xs text-orange-600 mb-1">🎯 타겟: {p.target}</p>
                    <p className="text-xs text-orange-500">{p.why_now}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시즌 전략 */}
          {result.season_strategy && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-700 mb-3">📅 시즌 전략</p>
              <div className="space-y-2">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-blue-500 mb-1">이번 달 집중 전략</p>
                  <p className="text-xs text-gray-600">{result.season_strategy.this_month}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-green-500 mb-1">다음 달 준비 전략</p>
                  <p className="text-xs text-gray-600">{result.season_strategy.next_month}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-red-400 mb-1">⚠️ 이번 달 피해야 할 것</p>
                  <p className="text-xs text-gray-600">{result.season_strategy.avoid}</p>
                </div>
              </div>
            </div>
          )}

          {/* 이벤트 기회 */}
          {result.event_opportunities?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🎉 이벤트 기회</p>
              <div className="space-y-2">
                {result.event_opportunities.map((ev, i) => (
                  <div key={i} className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#764ba2" }}>{ev.event}</span>
                      <span className="text-xs text-purple-500">{ev.timing}</span>
                    </div>
                    <p className="text-sm font-bold text-purple-800 mt-2 mb-1">{ev.product_idea}</p>
                    <p className="text-xs text-purple-600 italic">"{ev.copy}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 경쟁사 주의 */}
          {result.competitor_alert && (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm font-bold text-red-600 mb-1">⚠️ 경쟁사 주의사항</p>
              <p className="text-xs text-red-500">{result.competitor_alert}</p>
            </div>
          )}

          {/* 액션 체크리스트 */}
          {result.action_checklist?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-bold text-green-700 mb-3">✅ 지금 당장 해야 할 것</p>
              <div className="space-y-2">
                {result.action_checklist.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: "#2ecc71" }}>{i + 1}</span>
                    <p className="text-xs text-green-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
