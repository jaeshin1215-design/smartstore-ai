"use client";

import { useState } from "react";
import PolicyFilter from "@/components/PolicyFilter";

interface ValueAdd { idea: string; cost: string; effect: string; }
interface SeasonPromo { season: string; strategy: string; copy: string; }
interface DiscountResult {
  category_insight: string;
  discount_strategy: { recommended_rate: string; original_price_tip: string; method: string; reason: string };
  value_add: ValueAdd[];
  bundle_idea: { products: string[]; price_tip: string; benefit: string };
  season_promotions: SeasonPromo[];
  competitor_strategy: string;
}

const CATEGORIES = [
  "식품 > 건강식품", "식품 > 간식/음료", "의류 > 여성패션", "의류 > 남성패션",
  "뷰티 > 스킨케어", "뷰티 > 헤어케어", "생활 > 주방용품", "생활 > 인테리어",
  "디지털 > 이어폰/헤드폰", "디지털 > 스마트기기", "스포츠 > 운동용품", "유아 > 완구/교육"
];

export default function DiscountTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [result, setResult] = useState<DiscountResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productName || !category) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, purchasePrice, competitorPrice }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🎁 할인 & 가치 전략</h2>
      <p className="text-gray-400 text-sm mb-6">카테고리별 최적 할인 전략과 상품 가치를 높이는 방법을 알려드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명 <span className="text-red-400">*</span></label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 국산 유기농 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리 <span className="text-red-400">*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors bg-white">
            <option value="">카테고리 선택</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="직접입력">직접 입력</option>
          </select>
          {category === "직접입력" && (
            <input type="text" onChange={(e) => setCategory(e.target.value)}
              placeholder="카테고리 직접 입력"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors mt-2" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>매입가 (선택)</label>
            <div className="relative">
              <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="예) 8000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>경쟁사 최저가 (선택)</label>
            <div className="relative">
              <input type="number" value={competitorPrice} onChange={(e) => setCompetitorPrice(e.target.value)}
                placeholder="예) 15000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName || !category}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              전략 분석 중...
            </span>
          ) : "🎁 할인 & 가치 전략 만들기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 카테고리 인사이트 */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <p className="text-xs text-white/70 mb-1">📊 카테고리 인사이트</p>
            <p className="text-sm text-white leading-relaxed">{result.category_insight}</p>
          </div>

          {/* 할인 전략 */}
          {result.discount_strategy && (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm font-bold text-red-600 mb-3">💸 최적 할인 전략</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">추천 할인율</p>
                  <p className="text-xl font-bold text-red-500">{result.discount_strategy.recommended_rate}%</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center col-span-2">
                  <p className="text-xs text-gray-400">추천 방식</p>
                  <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>{result.discount_strategy.method}</p>
                </div>
              </div>
              <p className="text-xs text-red-600 mb-1"><strong>정가 설정 팁:</strong> {result.discount_strategy.original_price_tip}</p>
              <p className="text-xs text-red-500">{result.discount_strategy.reason}</p>
            </div>
          )}

          {/* 가치 더하기 */}
          {result.value_add?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>✨ 가치 더하기 아이디어</p>
              <div className="space-y-2">
                {result.value_add.map((v, i) => (
                  <div key={i} className="bg-yellow-50 rounded-xl p-4">
                    <p className="font-bold text-sm text-yellow-800 mb-1">{v.idea}</p>
                    <div className="flex gap-4">
                      <span className="text-xs text-yellow-600">추가 비용: {v.cost}</span>
                      <span className="text-xs text-green-600">효과: {v.effect}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 묶음 상품 */}
          {result.bundle_idea && (
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm font-bold text-purple-700 mb-2">📦 묶음 상품 구성</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {result.bundle_idea.products?.map((p, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: "#f0f0ff", color: "#667eea" }}>{p}</span>
                ))}
              </div>
              <p className="text-xs text-purple-600 mb-1">{result.bundle_idea.price_tip}</p>
              <p className="text-xs text-purple-500">{result.bundle_idea.benefit}</p>
            </div>
          )}

          {/* 시즌 프로모션 */}
          {result.season_promotions?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🗓️ 시즌별 프로모션</p>
              <div className="space-y-2">
                {result.season_promotions.map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#f39c12" }}>{s.season}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{s.strategy}</p>
                    <p className="text-xs font-bold" style={{ color: "#667eea" }}>"{s.copy}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 경쟁사 차별화 */}
          {result.competitor_strategy && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-bold text-green-700 mb-1">🏆 경쟁사 차별화 전략</p>
              <p className="text-xs text-green-600">{result.competitor_strategy}</p>
            </div>
          )}

          <PolicyFilter text={[result.discount_strategy?.method ?? "", ...(result.season_promotions?.map(s => s.copy) ?? [])].join(" ")} />
        </div>
      )}
    </div>
  );
}
