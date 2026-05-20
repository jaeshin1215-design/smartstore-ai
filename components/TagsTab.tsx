"use client";

import { useState } from "react";
import PolicyFilter from "@/components/PolicyFilter";

export default function TagsTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setTags([]);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category }),
      });
      const data = await res.json();
      if (data.result) setTags(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🏷️ 상품 태그 자동 생성</h2>
      <p className="text-gray-400 text-sm mb-6">상품명을 입력하면 검색 노출에 최적화된 태그 20개를 추천해드려요</p>

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
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리 (선택)</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예) 식품 > 건강식품"
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
              태그 생성 중...
            </span>
          ) : "🏷️ 태그 생성하기"}
        </button>
      </div>

      {tags.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>추천 태그 {tags.length}개</h3>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
              style={{ background: copied ? "#e8f9f0" : "#e8f0fe", color: copied ? "#2d9653" : "#4361ee" }}
            >
              {copied ? "✓ 복사됨!" : "📋 전체 복사"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: "#f0f0ff", color: "#667eea" }}
              >
                #{tag}
              </span>
            ))}
          </div>
          <PolicyFilter text={tags.join(" ")} />
        </div>
      )}
    </div>
  );
}
