"use client";

import { useState } from "react";

export default function CustomerTab() {
  const [mode, setMode] = useState<"reply" | "review">("reply");

  // 문의 답변
  const [inquiry, setInquiry] = useState("");
  const [replyResult, setReplyResult] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyCopied, setReplyCopied] = useState(false);

  // 리뷰 답글
  const [review, setReview] = useState("");
  const [reviewType, setReviewType] = useState("positive");
  const [reviewResult, setReviewResult] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);

  const handleReplySubmit = async () => {
    if (!inquiry) return;
    setReplyLoading(true);
    setReplyResult("");
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry }),
      });
      const data = await res.json();
      setReplyResult(data.result || "오류가 발생했습니다.");
    } catch {
      setReplyResult("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!review) return;
    setReviewLoading(true);
    setReviewResult("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, type: reviewType }),
      });
      const data = await res.json();
      setReviewResult(data.result || "오류가 발생했습니다.");
    } catch {
      setReviewResult("오류가 발생했습니다.");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>💬 고객 소통</h2>
      <p className="text-gray-400 text-sm mb-5">문의 답변과 리뷰 답글을 AI가 대신 작성해드려요</p>

      {/* 모드 선택 */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setMode("reply")}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all"
          style={mode === "reply"
            ? { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }
            : { background: "transparent", color: "#6b7280" }}>
          💬 고객 문의 답변
        </button>
        <button
          onClick={() => setMode("review")}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all"
          style={mode === "review"
            ? { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }
            : { background: "transparent", color: "#6b7280" }}>
          ⭐ 리뷰 답글
        </button>
      </div>

      {/* 고객 문의 답변 */}
      {mode === "reply" && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-600">💡 구매 전 문의, 배송 문의, 교환/반품 문의 등에 활용하세요</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
              고객 문의 내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              placeholder="예) 안녕하세요. 배송은 언제 오나요? 주문한 지 3일이 지났는데 아직 출발도 안 했네요."
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors resize-none" />
          </div>
          <button
            onClick={handleReplySubmit}
            disabled={replyLoading || !inquiry}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            {replyLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                답변 작성 중...
              </span>
            ) : "💬 답변 초안 생성하기"}
          </button>
          {replyResult && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>생성된 답변 초안</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(replyResult); setReplyCopied(true); setTimeout(() => setReplyCopied(false), 2000); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                  style={{ background: replyCopied ? "#e8f9f0" : "#e8f0fe", color: replyCopied ? "#2d9653" : "#4361ee" }}>
                  {replyCopied ? "✓ 복사됨!" : "📋 복사하기"}
                </button>
              </div>
              <textarea
                value={replyResult}
                onChange={(e) => setReplyResult(e.target.value)}
                rows={6}
                className="w-full bg-gray-50 rounded-xl p-4 text-sm leading-relaxed resize-none border border-gray-100 outline-none focus:border-indigo-300"
                style={{ color: "#1a1a2e" }} />
              <p className="text-gray-400 text-xs mt-1.5">✏️ 내용을 직접 수정한 후 사용하세요</p>
            </div>
          )}
        </div>
      )}

      {/* 리뷰 답글 */}
      {mode === "review" && (
        <div className="space-y-4">
          <div className="bg-yellow-50 rounded-xl p-3">
            <p className="text-xs text-yellow-700">💡 리뷰 답글은 다른 고객에게도 보입니다. 브랜드 이미지에 신경 쓰세요</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#1a1a2e" }}>리뷰 유형</label>
            <div className="flex gap-2">
              {[
                { value: "positive", label: "😊 긍정 리뷰", color: "#667eea" },
                { value: "negative", label: "😔 부정 리뷰", color: "#e74c3c" },
                { value: "neutral", label: "😐 중립 리뷰", color: "#f39c12" },
              ].map((t) => (
                <button key={t.value}
                  onClick={() => setReviewType(t.value)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all"
                  style={reviewType === t.value
                    ? { background: t.color, color: "white" }
                    : { background: "#f5f5f5", color: "#888" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
              고객 리뷰 내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={reviewType === "positive"
                ? "예) 배송도 빠르고 상품도 너무 마음에 들어요! 재구매 의사 있습니다 :)"
                : "예) 상품이 사진이랑 너무 다르네요. 색상도 다르고 크기도 작아요."}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors resize-none" />
          </div>
          <button
            onClick={handleReviewSubmit}
            disabled={reviewLoading || !review}
            className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            {reviewLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                답글 작성 중...
              </span>
            ) : "⭐ 답글 생성하기"}
          </button>
          {reviewResult && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>생성된 답글</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(reviewResult); setReviewCopied(true); setTimeout(() => setReviewCopied(false), 2000); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                  style={{ background: reviewCopied ? "#e8f9f0" : "#e8f0fe", color: reviewCopied ? "#2d9653" : "#4361ee" }}>
                  {reviewCopied ? "✓ 복사됨!" : "📋 복사하기"}
                </button>
              </div>
              <textarea
                value={reviewResult}
                onChange={(e) => setReviewResult(e.target.value)}
                rows={4}
                className="w-full bg-gray-50 rounded-xl p-4 text-sm leading-relaxed resize-none border border-gray-100 outline-none focus:border-indigo-300"
                style={{ color: "#1a1a2e" }} />
              <p className="text-gray-400 text-xs mt-1.5">✏️ 내용을 직접 수정한 후 사용하세요</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
