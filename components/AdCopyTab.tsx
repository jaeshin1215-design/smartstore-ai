"use client";

import { useState } from "react";
import PolicyFilter from "@/components/PolicyFilter";

interface AdCopy {
  title: string;
  description: string;
  keyword: string;
}

interface DiscountStrategy {
  original_price: string;
  sale_price: string;
  discount_rate: string;
  reason: string;
}

interface AdResult {
  ad_copies: AdCopy[];
  discount_strategy: DiscountStrategy;
  conversion_tips: string[];
  review_strategy: string;
}

export default function AdCopyTab() {
  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [features, setFeatures] = useState("");
  const [result, setResult] = useState<AdResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/adcopy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, purchasePrice, sellingPrice, targetCustomer, features }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>📣 광고 문구 & 전환율 전략</h2>
      <p className="text-gray-400 text-sm mb-6">쇼핑 광고 문구와 구매 전환율을 높이는 할인 전략을 만들어드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
            상품명 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 국산 유기농 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>매입가 (선택)</label>
            <div className="relative">
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="예) 8000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>현재 판매가 (선택)</label>
            <div className="relative">
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="예) 15000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>타겟 고객 (선택)</label>
          <input
            type="text"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            placeholder="예) 건강에 관심 있는 30~50대 여성"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품 특징 (선택)</label>
          <input
            type="text"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="예) 유기농 인증, 국산, 당일 발송"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !productName}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              전략 분석 중...
            </span>
          ) : "📣 광고 전략 만들기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 광고 문구 */}
          {result.ad_copies?.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-3" style={{ color: "#1a1a2e" }}>쇼핑 광고 문구</h3>
              <div className="space-y-3">
                {result.ad_copies.map((ad, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500">광고 {i + 1}</span>
                      <button
                        onClick={() => handleCopy(`${ad.title}\n${ad.description}`, i)}
                        className="text-xs px-3 py-1 rounded-lg font-semibold cursor-pointer"
                        style={{ background: copied === i ? "#e8f9f0" : "#e8f0fe", color: copied === i ? "#2d9653" : "#4361ee" }}
                      >
                        {copied === i ? "✓ 복사됨!" : "📋 복사"}
                      </button>
                    </div>
                    <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{ad.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{ad.description}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-xs text-gray-400">입찰 키워드:</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f0f0ff", color: "#667eea" }}>#{ad.keyword}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 할인 전략 */}
          {result.discount_strategy && (
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea15, #764ba215)", border: "1px solid #667eea30" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>💸 할인 전략 (네이버 알고리즘 최적화)</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">정가 표시</p>
                  <p className="font-bold text-sm line-through text-gray-400">
                    {Number(result.discount_strategy.original_price).toLocaleString()}원
                  </p>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                  <p className="text-xs text-white/80">실제 판매가</p>
                  <p className="font-bold text-sm text-white">
                    {Number(result.discount_strategy.sale_price).toLocaleString()}원
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-400">할인율</p>
                  <p className="font-bold text-sm text-red-500">{result.discount_strategy.discount_rate}% OFF</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{result.discount_strategy.reason}</p>
            </div>
          )}

          {/* 전환율 팁 */}
          {result.conversion_tips?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-bold text-green-700 mb-2">🎯 구매 전환율 높이는 팁</p>
              <div className="space-y-2">
                {result.conversion_tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span
                      className="w-4 h-4 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#2ecc71" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-xs text-green-700">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 리뷰 전략 */}
          {result.review_strategy && (
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="text-sm font-bold text-yellow-700 mb-1">⭐ 초기 리뷰 확보 전략</p>
              <p className="text-xs text-yellow-600">{result.review_strategy}</p>
            </div>
          )}

          <PolicyFilter text={[...(result.ad_copies?.map(a => `${a.title} ${a.description}`) ?? []), result.review_strategy ?? ""].join(" ")} />
        </div>
      )}
    </div>
  );
}
