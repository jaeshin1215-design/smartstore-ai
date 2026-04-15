"use client";

import { useState } from "react";

interface Keyword {
  keyword: string;
  tip: string;
}

export default function KeywordsTab() {
  const [productName, setProductName] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setKeywords([]);
    setError("");
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName }),
      });
      const data = await res.json();
      if (data.result) {
        setKeywords(data.result);
      } else {
        setError("결과를 가져오지 못했습니다.");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🔍 키워드 최적화 도우미</h2>
      <p className="text-gray-400 text-sm mb-6">상품명을 입력하면 검색 상위 노출에 유리한 키워드 10개를 추천해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="예) 무선 블루투스 이어폰"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !productName}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              키워드 분석 중...
            </span>
          ) : (
            "🔍 키워드 추천받기"
          )}
        </button>
      </div>

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

      {keywords.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-sm mb-3" style={{ color: "#1a1a2e" }}>추천 키워드 {keywords.length}개</h3>
          <div className="space-y-2">
            {keywords.map((kw, i) => (
              <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-xl p-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <span className="font-bold text-sm" style={{ color: "#1a1a2e" }}>#{kw.keyword}</span>
                  <p className="text-gray-400 text-xs mt-0.5">{kw.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
