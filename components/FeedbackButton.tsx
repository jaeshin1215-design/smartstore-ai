"use client";

import { useState } from "react";

const FEATURES = [
  "트렌드 분석", "상품명 SEO", "광고 전략", "고객 응대", "가격 책정",
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [usedFeatures, setUsedFeatures] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [role, setRole] = useState("");
  const [plan, setPlan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const toggleFeature = (f: string) =>
    setUsedFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      // Formspree는 이 폼에서 JSON body를 400으로 거부, form-urlencoded만 수락(실측 2026-07-10).
      // Accept: application/json으로 응답을 JSON({"ok":true})으로 받는다.
      const form = new URLSearchParams({
        rating: `${rating}점`,
        used_features: usedFeatures.join(", "),
        plan, comment, role,
      });
      const res = await fetch("https://formspree.io/f/mojyjrnv", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: form,
      });
      // 성공(res.ok)일 때만 감사 화면 — 실패 시 입력 유지하고 재시도 가능하게 (정직 원칙)
      if (res.ok) {
        setStep(2);
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => { setStep(1); setRating(0); setUsedFeatures([]); setComment(""); setRole(""); setPlan(""); setSubmitError(false); }, 300);
  };

  return (
    <>
      {/* Floating button — above bottom notice bar */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-12 right-4 z-50 flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm text-white shadow-lg cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: "#0f2a1e" }}>
        💬 피드백
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: "1px solid #e0ede9" }}>

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: "#0f2a1e" }}>
              <div>
                <p className="text-white font-bold text-base">💬 사용 후기를 남겨주세요</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  소중한 의견이 앱 개선에 큰 도움이 됩니다
                </p>
              </div>
              <button onClick={handleClose} className="text-white/40 hover:text-white text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-5">
              {step === 1 ? (
                <div className="space-y-5">
                  {/* 별점 */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>
                      전체 만족도 <span className="text-red-400">*</span>
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="text-3xl cursor-pointer transition-transform hover:scale-110">
                          {star <= (hoverRating || rating) ? "⭐" : "☆"}
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="text-sm self-center ml-1" style={{ color: "#6b7280" }}>
                          {["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "매우 좋아요!"][rating]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 셀러 유형 */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>셀러 유형</p>
                    <div className="flex flex-wrap gap-2">
                      {["초보 셀러 (1년 미만)", "중급 셀러 (1~3년)", "베테랑 셀러 (3년 이상)", "창업 준비 중"].map(r => (
                        <button key={r} onClick={() => setRole(r)}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold cursor-pointer transition-all border"
                          style={role === r
                            ? { background: "#0f2a1e", color: "white", borderColor: "#0f2a1e" }
                            : { background: "white", color: "#6b7280", borderColor: "#e0ede9" }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 사용한 기능 */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>
                      사용해본 기능 (복수 선택)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {FEATURES.map(f => (
                        <button key={f} onClick={() => toggleFeature(f)}
                          className="text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer transition-all border"
                          style={usedFeatures.includes(f)
                            ? { background: "#00aa6c", color: "white", borderColor: "#00aa6c" }
                            : { background: "white", color: "#6b7280", borderColor: "#e0ede9" }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 관심 있는 플랜 */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>관심 있는 플랜</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "basic", label: "기본 플랜", sub: "7일 무료 체험 → 49,900원/월" },
                        { id: "pro",   label: "Pro 플랜",  sub: "출시 예정" },
                      ].map(p => (
                        <button key={p.id} onClick={() => setPlan(p.id)}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold cursor-pointer transition-all border text-left"
                          style={plan === p.id
                            ? { background: "#0f2a1e", color: "white", borderColor: "#0f2a1e" }
                            : { background: "white", color: "#6b7280", borderColor: "#e0ede9" }}>
                          {p.label}
                          <span className="block text-[10px] font-normal opacity-70">{p.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 건의사항 */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>건의사항 / 불편한 점</p>
                    <textarea value={comment} onChange={e => setComment(e.target.value)}
                      placeholder="추가됐으면 하는 기능이나 개선점을 자유롭게 적어주세요"
                      rows={3}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                      style={{ background: "#f7faf9", border: "1px solid #e0ede9", color: "#0f2a1e" }} />
                  </div>

                  <button onClick={handleSubmit} disabled={!rating || submitting}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                    style={{ background: "#00aa6c" }}>
                    {submitting ? "전송 중..." : "📨 피드백 보내기"}
                  </button>
                  {submitError && (
                    <p className="text-xs text-center mt-2" style={{ color: "#dc2626" }}>
                      전송에 실패했습니다. 잠시 후 다시 시도해 주세요.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">🙏</p>
                  <p className="font-bold text-lg mb-1" style={{ color: "#0f2a1e" }}>감사합니다!</p>
                  <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
                    소중한 의견 잘 받았습니다.<br />더 좋은 서비스로 보답하겠습니다.
                  </p>
                  <button onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl font-bold text-white text-sm cursor-pointer transition-opacity hover:opacity-90"
                    style={{ background: "#00aa6c" }}>
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
