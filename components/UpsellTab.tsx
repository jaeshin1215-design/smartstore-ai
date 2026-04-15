"use client";

import { useState } from "react";

interface Option { name: string; description: string; add_price: string; reason: string; }
interface Bundle { name: string; products: string[]; original_total: string; bundle_price: string; discount_rate: string; selling_point: string; }
interface OnePlus { suggestion: string; price_strategy: string; psychology: string; }
interface CrossSell { product: string; reason: string; timing: string; }
interface RevenueBoost { current_aov: string; target_aov: string; monthly_impact: string; }
interface UpsellResult {
  options: Option[];
  bundles: Bundle[];
  oneplus: OnePlus;
  cross_sell: CrossSell[];
  revenue_boost: RevenueBoost;
  copy_examples: string[];
}

export default function UpsellTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [result, setResult] = useState<UpsellResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, sellingPrice, targetCustomer }),
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
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>📦 업셀링 전략</h2>
      <p className="text-gray-400 text-sm mb-6">옵션 구성·묶음 할인·1+1으로 객단가를 높이는 전략을 만들어드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명 <span className="text-red-400">*</span></label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 벽걸이형 온풍기"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="예) 가전 > 생활가전"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>판매가 (선택)</label>
            <div className="relative">
              <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="예) 35000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>타겟 고객 (선택)</label>
            <input type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
              placeholder="예) 자취생, 신혼부부"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              업셀링 전략 분석 중...
            </span>
          ) : "📦 업셀링 전략 만들기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 매출 증가 효과 */}
          {result.revenue_boost && (
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <p className="text-xs text-white/70 mb-2">📈 업셀링 적용 시 예상 매출 변화</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-xs text-white/70">현재 객단가</p>
                  <p className="font-bold text-white text-sm">{result.revenue_boost.current_aov}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/70">목표 객단가</p>
                  <p className="font-bold text-white text-sm">{result.revenue_boost.target_aov}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/70">월 추가 매출</p>
                  <p className="font-bold text-yellow-300 text-sm">{result.revenue_boost.monthly_impact}</p>
                </div>
              </div>
            </div>
          )}

          {/* 옵션 구성 */}
          {result.options?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>⚙️ 옵션 구성 추천</p>
              <div className="space-y-2">
                {result.options.map((opt, i) => (
                  <div key={i} className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-blue-800">{opt.name}</p>
                      <span className="text-sm font-bold text-blue-600">+{Number(opt.add_price).toLocaleString()}원</span>
                    </div>
                    <p className="text-xs text-blue-600 mb-1">{opt.description}</p>
                    <p className="text-xs text-gray-500">{opt.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 묶음 구성 */}
          {result.bundles?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🛍️ 묶음 상품 구성</p>
              <div className="space-y-3">
                {result.bundles.map((bundle, i) => (
                  <div key={i} className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-purple-800">{bundle.name}</p>
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-red-500">{bundle.discount_rate}% 할인</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {bundle.products?.map((p, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{p}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-gray-400 line-through">{Number(bundle.original_total).toLocaleString()}원</span>
                      <span className="text-sm font-bold text-purple-700">{Number(bundle.bundle_price).toLocaleString()}원</span>
                    </div>
                    <p className="text-xs text-purple-600">{bundle.selling_point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1+1 전략 */}
          {result.oneplus && (
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-sm font-bold text-orange-700 mb-2">🎁 1+1 전략</p>
              <p className="text-sm font-bold text-orange-800 mb-2">{result.oneplus.suggestion}</p>
              <p className="text-xs text-orange-600 mb-1">가격 전략: {result.oneplus.price_strategy}</p>
              <p className="text-xs text-orange-500">심리 포인트: {result.oneplus.psychology}</p>
            </div>
          )}

          {/* 크로스셀 */}
          {result.cross_sell?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🔗 함께 팔면 좋은 상품</p>
              <div className="space-y-2">
                {result.cross_sell.map((cs, i) => (
                  <div key={i} className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-green-800">{cs.product}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-700">{cs.timing}</span>
                    </div>
                    <p className="text-xs text-green-600">{cs.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 유도 문구 */}
          {result.copy_examples?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>💬 업셀링 유도 문구</p>
              <div className="space-y-2">
                {result.copy_examples.map((copy, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-700 font-medium">"{copy}"</p>
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
