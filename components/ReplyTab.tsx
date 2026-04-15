"use client";

import { useState } from "react";

export default function ReplyTab() {
  const [inquiry, setInquiry] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!inquiry) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry }),
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
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>💬 고객 문의 자동 답변</h2>
      <p className="text-gray-400 text-sm mb-6">고객 문의를 붙여넣으면 AI가 친절한 답변 초안을 작성해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>고객 문의 내용</label>
          <textarea
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder={"예) 안녕하세요. 배송은 언제 오나요? 주문한 지 3일이 지났는데 아직 출발도 안 했네요."}
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !inquiry}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              답변 작성 중...
            </span>
          ) : (
            "💬 답변 초안 생성하기"
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>생성된 답변 초안</h3>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
              style={{ background: copied ? "#e8f9f0" : "#e8f0fe", color: copied ? "#2d9653" : "#4361ee" }}
            >
              {copied ? "✓ 복사됨!" : "📋 복사하기"}
            </button>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={6}
            className="w-full bg-gray-50 rounded-xl p-4 text-sm leading-relaxed resize-none border border-gray-100 outline-none focus:border-indigo-300"
            style={{ color: "#1a1a2e" }}
          />
          <p className="text-gray-400 text-xs mt-1.5">✏️ 내용을 직접 수정한 후 사용하세요</p>
        </div>
      )}
    </div>
  );
}
