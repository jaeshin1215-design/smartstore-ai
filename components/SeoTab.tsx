"use client";

import { useState } from "react";

interface OptimizedName {
  name: string;
  reason: string;
  keywords_used: string[];
}

interface SeoResult {
  optimized_names: OptimizedName[];
  seo_tips: string[];
  avoid: string[];
}

export default function SeoTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState<SeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, keywords }),
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

  const labels = ["공격적", "중간", "안전"];

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>📈 상품명 SEO 최적화</h2>
      <p className="text-gray-400 text-sm mb-6">검색 상위 노출을 위한 최적화된 상품명 3가지를 추천해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
            현재 상품명 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
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
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>강조하고 싶은 키워드 (선택)</label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="예) 유기농, 국산, 당일발송"
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
              SEO 분석 중...
            </span>
          ) : "📈 상품명 최적화하기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 최적화된 상품명 */}
          <div>
            <h3 className="font-bold text-sm mb-3" style={{ color: "#1a1a2e" }}>추천 상품명 3가지</h3>
            <div className="space-y-3">
              {result.optimized_names?.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: i === 0 ? "#e74c3c" : i === 1 ? "#667eea" : "#2ecc71" }}
                    >
                      {labels[i] || `버전 ${i + 1}`}
                    </span>
                    <button
                      onClick={() => handleCopy(item.name, i)}
                      className="text-xs px-3 py-1 rounded-lg font-semibold cursor-pointer"
                      style={{ background: copied === i ? "#e8f9f0" : "#e8f0fe", color: copied === i ? "#2d9653" : "#4361ee" }}
                    >
                      {copied === i ? "✓ 복사됨!" : "📋 복사"}
                    </button>
                  </div>
                  <p className="font-bold text-sm mb-2" style={{ color: "#1a1a2e" }}>{item.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{item.reason}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.keywords_used?.map((kw, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0f0ff", color: "#667eea" }}>
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEO 팁 */}
          {result.seo_tips?.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-700 mb-2">💡 SEO 노출 팁</p>
              <div className="space-y-1.5">
                {result.seo_tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-blue-400 text-xs mt-0.5">•</span>
                    <p className="text-xs text-blue-600">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 피해야 할 것 */}
          {result.avoid?.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm font-bold text-red-600 mb-2">⚠️ 이것은 피하세요</p>
              <div className="space-y-1.5">
                {result.avoid.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-red-400 text-xs mt-0.5">✕</span>
                    <p className="text-xs text-red-500">{item}</p>
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
