"use client";

import { useState } from "react";
import PolicyFilter from "@/components/PolicyFilter";
import { useStream } from "@/lib/useStream";

const CARD: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  border: "1px solid #e0ede9",
};
const inputCls = "w-full text-sm rounded-lg px-4 py-3 outline-none transition-all placeholder:text-gray-400 text-[#0f2a1e] resize-none";
const inputStyle: React.CSSProperties = { background: "#f7faf9", border: "1px solid #e0ede9" };
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";
const labelStyle: React.CSSProperties = { color: "#9ca3af" };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const copy = () => {
      const el = document.createElement("textarea");
      el.value = text; el.style.cssText = "position:fixed;left:-9999px;opacity:0;";
      document.body.appendChild(el); el.focus(); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).catch(copy); } else { copy(); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors"
      style={{ background: copied ? "#e8f5f0" : "#f0f0f5", color: copied ? "#00aa6c" : "#6b7280" }}>
      {copied ? "✓ 복사됨!" : "📋 복사하기"}
    </button>
  );
}

export default function CustomerTab() {
  const [mode, setMode] = useState<"reply" | "review">("reply");

  const [inquiry, setInquiry] = useState("");
  const [replyResult, setReplyResult] = useState("");
  const replyStream = useStream();

  const [review, setReview] = useState("");
  const [reviewType, setReviewType] = useState("positive");
  const [reviewResult, setReviewResult] = useState("");
  const reviewStream = useStream();

  const handleReplySubmit = async () => {
    if (!inquiry) return;
    setReplyResult("");
    try {
      const res = await fetch("/api/reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry }),
      });
      await replyStream.readStream(res, (text) => setReplyResult(text), () => setReplyResult("오류가 발생했습니다."));
    } catch { setReplyResult("오류가 발생했습니다."); }
  };

  const handleReviewSubmit = async () => {
    if (!review) return;
    setReviewResult("");
    try {
      const res = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, type: reviewType }),
      });
      await reviewStream.readStream(res, (text) => setReviewResult(text), () => setReviewResult("오류가 발생했습니다."));
    } catch { setReviewResult("오류가 발생했습니다."); }
  };

  return (
    <div className="lg:grid lg:gap-7" style={{ gridTemplateColumns: "1fr 420px" }}>

      {/* ── LEFT: Hero ── */}
      <div className="mb-6 lg:mb-0">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#00aa6c" }}>
          CS ASSISTANT
        </p>
        <h1 className="font-extrabold leading-tight mb-2"
          style={{ fontSize: "clamp(26px,5vw,36px)", color: "#0f2a1e" }}>
          고객 답변<br />자동화
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#6b8c7a" }}>
          문의 답변과 리뷰 답글을<br className="hidden lg:block" />
          AI가 타이핑해드려요.
        </p>
        <div className="hidden lg:block space-y-2.5 mb-6">
          {[
            "문의 유형별 맞춤 답변",
            "브랜드 톤앤매너 반영",
            "바로 복사해서 사용 가능",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "#00aa6c" }}>✓</span>
              <span className="text-sm" style={{ color: "#4b7a63" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Usage tip - desktop only */}
        <div className="hidden lg:block space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>활용 방법</p>
          {[
            { icon: "💬", title: "고객 문의 답변", desc: "구매 전 문의, 배송, 교환/반품 답변 초안" },
            { icon: "⭐", title: "리뷰 답글", desc: "긍정/부정/중립 리뷰별 맞춤 답글" },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl p-3"
              style={{ background: "#f7faf9", border: "1px solid #e0ede9" }}>
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#0f2a1e" }}>{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Card ── */}
      <div style={CARD} className="p-5">
        {/* Card header */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#00aa6c" }}>답변 생성</p>
          <h2 className="font-bold text-base" style={{ color: "#0f2a1e" }}>고객 커뮤니케이션 AI</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>유형을 선택하고 내용을 입력하세요</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "#f7faf9" }}>
          {[
            { id: "reply",  label: "💬 고객 문의 답변" },
            { id: "review", label: "⭐ 리뷰 답글" },
          ].map((t) => (
            <button key={t.id} onClick={() => setMode(t.id as "reply" | "review")}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all"
              style={mode === t.id
                ? { background: "#0f2a1e", color: "white" }
                : { background: "transparent", color: "#9ca3af" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Reply mode */}
        {mode === "reply" && (
          <div className="space-y-4">
            <div className="rounded-lg p-3 border" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
              <p className="text-xs" style={{ color: "#0369a1" }}>💡 구매 전 문의, 배송 문의, 교환/반품 문의 등에 활용하세요</p>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>고객 문의 내용 <span className="text-red-400 normal-case">*</span></label>
              <textarea value={inquiry} onChange={e => setInquiry(e.target.value)} rows={4}
                placeholder="예) 안녕하세요. 배송은 언제 오나요? 주문한 지 3일이 지났는데 아직 출발도 안 했네요."
                className={inputCls} style={inputStyle} />
            </div>
            <button onClick={handleReplySubmit} disabled={replyStream.streaming || !inquiry}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: "#00aa6c" }}>
              {replyStream.streaming
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI 작성 중...
                  </span>
                : "💬 답변 초안 생성하기"}
            </button>

            {(replyStream.streaming || replyResult) && (
              <div>
                {!replyStream.streaming && (
                  <div className="rounded-lg px-4 py-2.5 mb-3 border-l-4"
                    style={{ background: "#e8f5f0", borderColor: "#00aa6c" }}>
                    <p className="text-xs font-bold" style={{ color: "#007a4d" }}>
                      ⚡ 복사해서 스마트스토어 문의 답변란에 붙여넣으세요
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>생성된 답변 초안</p>
                  {!replyStream.streaming && replyResult && <CopyButton text={replyResult} />}
                </div>
                <div className="relative">
                  <textarea
                    value={replyStream.streaming ? replyStream.streamText : replyResult}
                    onChange={e => { if (!replyStream.streaming) setReplyResult(e.target.value); }}
                    rows={6}
                    className="w-full rounded-xl p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-[#00aa6c] text-[#0f2a1e]"
                    style={{ background: "#f7faf9", border: "1px solid #e0ede9", lineHeight: 1.7 }}
                    readOnly={replyStream.streaming}
                  />
                  {replyStream.streaming && (
                    <span className="absolute bottom-5 right-4 inline-block w-0.5 h-4 animate-pulse"
                      style={{ background: "#00aa6c" }} />
                  )}
                </div>
                {!replyStream.streaming && (
                  <p className="text-xs mt-1.5" style={{ color: "#9ca3af" }}>✏️ 내용을 직접 수정한 후 사용하세요</p>
                )}
                {!replyStream.streaming && replyResult && <PolicyFilter text={replyResult} />}
              </div>
            )}
          </div>
        )}

        {/* Review mode */}
        {mode === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg p-3 border" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
              <p className="text-xs" style={{ color: "#92400e" }}>💡 리뷰 답글은 다른 고객에게도 보입니다. 브랜드 이미지에 신경 쓰세요</p>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>리뷰 유형</label>
              <div className="flex gap-2">
                {[
                  { value: "positive", label: "😊 긍정", color: "#00aa6c" },
                  { value: "negative", label: "😔 부정", color: "#ef4444" },
                  { value: "neutral",  label: "😐 중립", color: "#f59e0b" },
                ].map((t) => (
                  <button key={t.value} onClick={() => setReviewType(t.value)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all"
                    style={reviewType === t.value
                      ? { background: t.color, color: "white" }
                      : { background: "#f7faf9", color: "#9ca3af", border: "1px solid #e0ede9" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>고객 리뷰 내용 <span className="text-red-400 normal-case">*</span></label>
              <textarea value={review} onChange={e => setReview(e.target.value)} rows={4}
                placeholder={reviewType === "positive"
                  ? "예) 배송도 빠르고 상품도 너무 마음에 들어요! 재구매 의사 있습니다 :)"
                  : "예) 상품이 사진이랑 너무 다르네요. 색상도 다르고 크기도 작아요."}
                className={inputCls} style={inputStyle} />
            </div>

            <button onClick={handleReviewSubmit} disabled={reviewStream.streaming || !review}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: "#00aa6c" }}>
              {reviewStream.streaming
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI 작성 중...
                  </span>
                : "⭐ 답글 생성하기"}
            </button>

            {(reviewStream.streaming || reviewResult) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>생성된 답글</p>
                  {!reviewStream.streaming && reviewResult && <CopyButton text={reviewResult} />}
                </div>
                <div className="relative">
                  <textarea
                    value={reviewStream.streaming ? reviewStream.streamText : reviewResult}
                    onChange={e => { if (!reviewStream.streaming) setReviewResult(e.target.value); }}
                    rows={5}
                    className="w-full rounded-xl p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-[#00aa6c] text-[#0f2a1e]"
                    style={{ background: "#f7faf9", border: "1px solid #e0ede9", lineHeight: 1.7 }}
                    readOnly={reviewStream.streaming}
                  />
                  {reviewStream.streaming && (
                    <span className="absolute bottom-5 right-4 inline-block w-0.5 h-4 animate-pulse"
                      style={{ background: "#00aa6c" }} />
                  )}
                </div>
                {!reviewStream.streaming && (
                  <p className="text-xs mt-1.5" style={{ color: "#9ca3af" }}>✏️ 내용을 직접 수정한 후 사용하세요</p>
                )}
                {!reviewStream.streaming && reviewResult && <PolicyFilter text={reviewResult} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
