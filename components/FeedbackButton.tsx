"use client";

import { useState } from "react";

const FEATURES = [
  "상품 설명문", "상품명 SEO", "세부 키워드", "썸네일 문구",
  "All in One 콘텐츠", "이미지 기획", "트렌드 리포트", "광고 전략",
  "가격 책정", "구매 전환율", "이미지 편집기", "기타"
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: 폼, 2: 완료
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [usedFeatures, setUsedFeatures] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleFeature = (f: string) => {
    setUsedFeatures(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch("https://formspree.io/f/mojyjrnv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: `${rating}점`,
          used_features: usedFeatures.join(", "),
          comment,
          role,
        }),
      });
    } catch {
      // 폼 미등록 시 무시
    }
    setStep(2);
    setSubmitting(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => { setStep(1); setRating(0); setUsedFeatures([]); setComment(""); setRole(""); }, 300);
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm text-white shadow-lg cursor-pointer"
        style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
        💬 피드백
      </button>

      {/* 모달 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
          onClick={(e) => e.target === e.currentTarget && handleClose()}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* 헤더 */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <div>
                <p className="text-white font-bold text-base">💬 사용 후기를 남겨주세요</p>
                <p className="text-white/70 text-xs mt-0.5">소중한 의견이 앱 개선에 큰 도움이 됩니다</p>
              </div>
              <button onClick={handleClose} className="text-white/70 hover:text-white text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-5">
              {step === 1 ? (
                <div className="space-y-5">
                  {/* 별점 */}
                  <div>
                    <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>전체 만족도 <span className="text-red-400">*</span></p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="text-3xl cursor-pointer transition-transform hover:scale-110">
                          {star <= (hoverRating || rating) ? "⭐" : "☆"}
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="text-sm text-gray-500 self-center ml-1">
                          {["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "매우 좋아요!"][rating]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 셀러 유형 */}
                  <div>
                    <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>셀러 유형</p>
                    <div className="flex flex-wrap gap-2">
                      {["초보 셀러 (1년 미만)", "중급 셀러 (1~3년)", "베테랑 셀러 (3년 이상)", "창업 준비 중"].map((r) => (
                        <button key={r} onClick={() => setRole(r)}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold cursor-pointer transition-all"
                          style={role === r
                            ? { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }
                            : { background: "#f0f0ff", color: "#667eea" }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 사용한 기능 */}
                  <div>
                    <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>사용해본 기능 (복수 선택)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FEATURES.map((f) => (
                        <button key={f} onClick={() => toggleFeature(f)}
                          className="text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer transition-all"
                          style={usedFeatures.includes(f)
                            ? { background: "#667eea", color: "white" }
                            : { background: "#f3f4f6", color: "#6b7280" }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 건의사항 */}
                  <div>
                    <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>건의사항 / 불편한 점</p>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="추가됐으면 하는 기능이나 개선점을 자유롭게 적어주세요"
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 resize-none" />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!rating || submitting}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                    {submitting ? "전송 중..." : "📨 피드백 보내기"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">🙏</p>
                  <p className="font-bold text-lg mb-1" style={{ color: "#1a1a2e" }}>감사합니다!</p>
                  <p className="text-sm text-gray-500 mb-6">소중한 의견 잘 받았습니다.<br />더 좋은 서비스로 보답하겠습니다.</p>
                  <button onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl font-bold text-white text-sm cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
