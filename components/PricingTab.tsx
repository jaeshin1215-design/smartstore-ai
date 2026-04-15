"use client";

import { useState } from "react";

interface PricingResult {
  recommended_price: number;
  min_price: number;
  max_price: number;
  margin_rate: number;
  strategy: string;
  tips: string[];
}

export default function PricingTab() {
  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productName || !purchasePrice) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, purchasePrice, category, features }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    price?.toLocaleString("ko-KR") + "원";

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>💰 가격 책정 도우미</h2>
      <p className="text-gray-400 text-sm mb-6">매입가를 입력하면 AI가 최적의 판매 가격과 전략을 분석해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 국산 유기농 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
            매입가 (원가) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="예) 8000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리 (선택)</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예) 식품 > 건강식품"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품 특징 (선택)</label>
          <input
            type="text"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="예) 유기농 인증, 프리미엄 포장, 당일 발송"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !productName || !purchasePrice}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              가격 분석 중...
            </span>
          ) : "💰 최적 가격 분석하기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 가격 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">최소 판매가</p>
              <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{formatPrice(result.min_price)}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <p className="text-xs text-white/80 mb-1">✨ 추천 판매가</p>
              <p className="font-bold text-sm text-white">{formatPrice(result.recommended_price)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">최대 판매가</p>
              <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{formatPrice(result.max_price)}</p>
            </div>
          </div>

          {/* 마진율 */}
          <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-700">예상 마진율</p>
              <p className="text-xs text-green-500 mt-0.5">수수료 · 배송비 포함 계산</p>
            </div>
            <span className="text-2xl font-bold text-green-600">{result.margin_rate}%</span>
          </div>

          {/* 전략 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold mb-2" style={{ color: "#1a1a2e" }}>📊 가격 전략</p>
            <p className="text-sm text-gray-600 leading-relaxed">{result.strategy}</p>
          </div>

          {/* 팁 */}
          {result.tips?.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#1a1a2e" }}>💡 판매 팁</p>
              <div className="space-y-2">
                {result.tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span
                      className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-600">{tip}</p>
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
