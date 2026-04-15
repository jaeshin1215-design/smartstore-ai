"use client";

import { useState } from "react";

export default function DescriptionTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState(["", "", ""]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
  };

  const handleSubmit = async () => {
    if (!productName || !category || features.some((f) => !f)) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, features }),
      });
      const data = await res.json();
      setResult(data.result || "오류가 발생했습니다.");
    } catch {
      setResult("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>📝 상품 설명문 자동 생성</h2>
      <p className="text-gray-400 text-sm mb-6">상품 정보를 입력하면 AI가 최적화된 설명문을 작성해드려요</p>

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
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예) 식품 > 건강식품 > 분말/가루"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>주요 특징 3가지</label>
          <div className="space-y-2">
            {features.map((f, i) => (
              <input
                key={i}
                type="text"
                value={f}
                onChange={(e) => handleFeatureChange(i, e.target.value)}
                placeholder={`특징 ${i + 1} 예) 국내산 100% 원료 사용`}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !productName || !category || features.some((f) => !f)}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI가 작성 중...
            </span>
          ) : (
            "✨ 설명문 생성하기"
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>생성된 설명문</h3>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
              style={{ background: copied ? "#e8f9f0" : "#e8f0fe", color: copied ? "#2d9653" : "#4361ee" }}
            >
              {copied ? "✓ 복사됨!" : "📋 복사하기"}
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1a1a2e" }}>
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
