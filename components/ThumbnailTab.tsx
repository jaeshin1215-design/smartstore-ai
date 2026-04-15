"use client";

import { useState } from "react";

interface ThumbnailSet {
  main: string;
  sub: string;
  badge: string;
}

export default function ThumbnailTab() {
  const [productName, setProductName] = useState("");
  const [highlight, setHighlight] = useState("");
  const [sets, setSets] = useState<ThumbnailSet[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setSets([]);
    try {
      const res = await fetch("/api/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, highlight }),
      });
      const data = await res.json();
      if (data.result) setSets(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🖼️ 썸네일 문구 생성</h2>
      <p className="text-gray-400 text-sm mb-6">클릭률을 높이는 썸네일 텍스트 문구 5세트를 만들어드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 무선 블루투스 이어폰"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>강조할 점 (선택)</label>
          <input
            type="text"
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            placeholder="예) 오늘만 특가, 1+1 행사, 무료배송"
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
              문구 생성 중...
            </span>
          ) : "🖼️ 썸네일 문구 생성하기"}
        </button>
      </div>

      {sets.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-sm mb-3" style={{ color: "#1a1a2e" }}>추천 문구 {sets.length}세트</h3>
          <div className="space-y-3">
            {sets.map((set, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">세트 {i + 1}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0">메인</span>
                    <span className="font-bold text-base" style={{ color: "#1a1a2e" }}>{set.main}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0">서브</span>
                    <span className="text-sm text-gray-600">{set.sub}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0">뱃지</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#fff0f0", color: "#e74c3c" }}
                    >
                      {set.badge}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
