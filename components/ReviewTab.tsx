"use client";

import { useState } from "react";

export default function ReviewTab() {
  const [review, setReview] = useState("");
  const [type, setType] = useState("positive");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!review) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, type }),
      });
      const data = await res.json();
      setResult(data.result || "오류가 발생했습니다.");
    } catch {
      setResult("오류가 발생했습니다.");
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
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>⭐ 리뷰 답글 자동 생성</h2>
      <p className="text-gray-400 text-sm mb-6">고객 리뷰를 붙여넣으면 AI가 적절한 답글을 작성해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1a2e" }}>리뷰 유형</label>
          <div className="flex gap-3">
            <button
              onClick={() => setType("positive")}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all"
              style={type === "positive"
                ? { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }
                : { background: "#f5f5f5", color: "#888" }}
            >
              😊 긍정 리뷰
            </button>
            <button
              onClick={() => setType("negative")}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all"
              style={type === "negative"
                ? { background: "linear-gradient(135deg, #e74c3c, #c0392b)", color: "white" }
                : { background: "#f5f5f5", color: "#888" }}
            >
              😔 부정 리뷰
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>고객 리뷰 내용</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={type === "positive"
              ? "예) 배송도 빠르고 상품도 너무 마음에 들어요! 재구매 의사 있습니다 :)"
              : "예) 상품이 사진이랑 너무 다르네요. 색상도 다르고 크기도 작아요."}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !review}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              답글 작성 중...
            </span>
          ) : "⭐ 답글 생성하기"}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>생성된 답글</h3>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
              style={{ background: copied ? "#e8f9f0" : "#e8f0fe", color: copied ? "#2d9653" : "#4361ee" }}
            >
              {copied ? "✓ 복사됨!" : "📋 복사하기"}
            </button>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={4}
            className="w-full bg-gray-50 rounded-xl p-4 text-sm leading-relaxed resize-none border border-gray-100 outline-none focus:border-indigo-300"
            style={{ color: "#1a1a2e" }}
          />
          <p className="text-gray-400 text-xs mt-1.5">✏️ 내용을 직접 수정한 후 사용하세요</p>
        </div>
      )}
    </div>
  );
}
