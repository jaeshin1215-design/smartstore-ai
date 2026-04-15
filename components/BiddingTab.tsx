"use client";

import { useState } from "react";

interface Keyword {
  keyword: string;
  type: string;
  estimated_cpc: string;
  competition: string;
  recommended: boolean;
  reason: string;
}
interface BiddingResult {
  keywords: Keyword[];
  strategy: { phase1: string; phase2: string; phase3: string };
  budget_allocation: { small_keywords: string; medium_keywords: string; reason: string };
  roi_estimate: string;
  tips: string[];
}

export default function BiddingTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [result, setResult] = useState<BiddingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/bidding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, dailyBudget, sellingPrice }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const competitionColor = (c: string) =>
    c === "높음" ? "#e74c3c" : c === "중간" ? "#f39c12" : "#2ecc71";

  const typeColor = (t: string) =>
    t === "대형" ? "#e74c3c" : t === "중형" ? "#667eea" : "#2ecc71";

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>💡 키워드 입찰 전략</h2>
      <p className="text-gray-400 text-sm mb-6">적은 예산으로 상단 노출되는 중소형 키워드 입찰 전략을 만들어드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명 <span className="text-red-400">*</span></label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 무선 블루투스 이어폰"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="예) 디지털 > 이어폰"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>일 광고 예산</label>
            <div className="relative">
              <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="예) 30000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>판매가</label>
            <div className="relative">
              <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="예) 15000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              입찰 전략 분석 중...
            </span>
          ) : "💡 키워드 입찰 전략 만들기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 키워드 목록 */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>추천 키워드 목록</p>
            <div className="space-y-2">
              {result.keywords?.map((kw, i) => (
                <div key={i} className={`rounded-xl p-4 border-2 ${kw.recommended ? "border-indigo-300 bg-indigo-50" : "border-gray-100 bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {kw.recommended && <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#667eea" }}>추천</span>}
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: typeColor(kw.type) }}>{kw.type}</span>
                      <span className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{kw.keyword}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: competitionColor(kw.competition) }}>경쟁 {kw.competition}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">예상 CPC: <strong>{kw.estimated_cpc}</strong></span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{kw.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 예산 배분 */}
          {result.budget_allocation && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-700 mb-3">💰 예산 배분 전략</p>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">소형 키워드</p>
                  <p className="text-xl font-bold" style={{ color: "#2ecc71" }}>{result.budget_allocation.small_keywords}%</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">중형 키워드</p>
                  <p className="text-xl font-bold" style={{ color: "#667eea" }}>{result.budget_allocation.medium_keywords}%</p>
                </div>
              </div>
              <p className="text-xs text-blue-600">{result.budget_allocation.reason}</p>
            </div>
          )}

          {/* 단계별 전략 */}
          {result.strategy && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>📅 단계별 광고 전략</p>
              <div className="space-y-2">
                {[
                  { label: "1~2주차", content: result.strategy.phase1, color: "#e74c3c" },
                  { label: "3~4주차", content: result.strategy.phase2, color: "#f39c12" },
                  { label: "2개월+", content: result.strategy.phase3, color: "#2ecc71" },
                ].map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 flex gap-3">
                    <span className="text-xs font-bold text-white px-2 py-1 rounded-lg flex-shrink-0 h-fit" style={{ background: p.color }}>{p.label}</span>
                    <p className="text-xs text-gray-600">{p.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROI + 팁 */}
          {result.roi_estimate && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-bold text-green-700 mb-1">📈 예상 광고 ROI</p>
              <p className="text-xs text-green-600">{result.roi_estimate}</p>
            </div>
          )}
          {result.tips?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>💡 광고 운영 팁</p>
              <div className="space-y-1">
                {result.tips.map((tip, i) => (
                  <div key={i} className="flex gap-2"><span className="text-indigo-400 text-xs mt-0.5">•</span><p className="text-xs text-gray-600">{tip}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
