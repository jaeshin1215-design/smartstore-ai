"use client";

import { useState } from "react";

const PRIMARY = "#00aa6c";
const DARK    = "#0f2a1e";
const BORDER  = "#e0ede9";
const MUTED   = "#9ca3af";
const BG_CARD = "#ffffff";
const BG_LIGHT = "#f7faf9";
const BG_GREEN = "#e8f5f0";

const CARD: React.CSSProperties = {
  background: BG_CARD,
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  border: `1px solid ${BORDER}`,
};

// ── Star Rating ──
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2 mt-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
          style={{ color: s <= (hover || value) ? "#f59e0b" : "#d1d5db", background: "none", border: "none", cursor: "pointer" }}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm self-center ml-1" style={{ color: MUTED }}>
          {["", "아쉬워요", "조금 아쉬워요", "보통이에요", "좋아요", "매우 좋아요"][value]}
        </span>
      )}
    </div>
  );
}

// ── Text Area ──
function TextArea({ value, onChange, placeholder, required }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "자유롭게 적어주세요"}
      required={required}
      rows={4}
      className="w-full text-sm rounded-xl px-4 py-3 outline-none transition-all resize-none"
      style={{ background: BG_LIGHT, border: `1px solid ${BORDER}`, color: DARK, lineHeight: 1.7 }}
    />
  );
}

// ── Section Header ──
function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: PRIMARY }}>{label}</p>
      {sub && <p className="text-sm leading-relaxed" style={{ color: "#6b8c7a" }}>{sub}</p>}
    </div>
  );
}

// ── Question Block ──
function QBlock({ num, question, children }: { num: string; question: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>{num}</p>
      <p className="text-base font-semibold mb-3" style={{ color: DARK, lineHeight: 1.5 }}>{question}</p>
      {children}
    </div>
  );
}

// ── Progress Bar ──
function Progress({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold" style={{ color: MUTED }}>섹션 {current} / {total}</span>
        <span className="text-xs font-semibold" style={{ color: PRIMARY }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: BG_GREEN }}>
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: PRIMARY }} />
      </div>
    </div>
  );
}

const TOTAL_SECTIONS = 6;

export default function SurveyPage() {
  const [step, setStep] = useState(0); // 0=intro, 1-6=sections, 7=thanks
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [q1Star, setQ1Star] = useState(0);
  const [q1Text, setQ1Text] = useState("");
  const [q2Text, setQ2Text] = useState("");
  const [q3Star, setQ3Star] = useState(0);
  const [q3Text, setQ3Text] = useState("");
  const [q4Text, setQ4Text] = useState("");
  const [q5Star, setQ5Star] = useState(0);
  const [q5Text, setQ5Text] = useState("");
  const [q6Text, setQ6Text] = useState("");
  const [q7Text, setQ7Text] = useState("");
  const [q8Text, setQ8Text] = useState("");
  const [q9Choices, setQ9Choices] = useState<string[]>([]);
  const [q9Other, setQ9Other] = useState("");
  const [q10Text, setQ10Text] = useState("");

  const toggleChoice = (c: string) =>
    setQ9Choices((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const canNext = () => {
    if (step === 1) return q1Star > 0 && q1Text.trim() && q2Text.trim();
    if (step === 2) return q3Star > 0 && q3Text.trim() && q4Text.trim();
    if (step === 3) return q5Star > 0 && q5Text.trim() && q6Text.trim();
    if (step === 4) return q7Text.trim() && q8Text.trim();
    if (step === 5) return q9Choices.length > 0 || q9Other.trim();
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q1Star, q1Text, q2Text,
          q3Star, q3Text, q4Text,
          q5Star, q5Text, q6Text,
          q7Text, q8Text,
          q9: [...q9Choices, q9Other ? `기타: ${q9Other}` : ""].filter(Boolean),
          q10Text,
        }),
      });
      if (!res.ok) throw new Error("제출 실패");
      setStep(7);
    } catch {
      setError("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const btnStyle: React.CSSProperties = {
    background: PRIMARY, color: "white", borderRadius: 12,
    fontWeight: 700, fontSize: 15, padding: "14px 0",
    border: "none", cursor: "pointer", width: "100%", transition: "opacity 0.2s",
  };
  const btnDisabled: React.CSSProperties = { ...btnStyle, opacity: 0.4, cursor: "not-allowed" };

  return (
    <div className="min-h-screen py-8 px-4"
      style={{ background: "linear-gradient(135deg, #e8f5f0 0%, #eef0f8 50%, #e8f5f0 100%)" }}>
      <div className="max-w-lg mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">🛍️</span>
          <span className="font-bold text-base" style={{ color: DARK }}>SellFit</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: BG_GREEN, color: PRIMARY }}>SURVEY</span>
        </div>

        {/* ── STEP 0: Intro ── */}
        {step === 0 && (
          <div style={CARD} className="p-7">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: PRIMARY }}>이지스토리 · 피드백 설문</p>
            <h1 className="font-extrabold text-2xl mb-5 leading-tight" style={{ color: DARK }}>다슬님 안녕하세요.</h1>
            <div className="text-sm leading-relaxed space-y-3 mb-7" style={{ color: "#4b7a63" }}>
              <p>빈 대표님과의 1차 미팅 후 이어서 작업하고 있습니다.</p>
              <p>다슬님의 SellFit 사용 경험과 영업·마케팅 현장 감각이 앞으로 작업하는 데 큰 도움이 될 것 같습니다.</p>
              <p>떠오르는 대로 답해주세요.</p>
            </div>
            <div className="flex items-center gap-3 mb-7 p-4 rounded-xl" style={{ background: BG_GREEN, border: `1px solid ${BORDER}` }}>
              <span className="text-2xl">⏱</span>
              <div>
                <p className="text-xs font-bold" style={{ color: PRIMARY }}>예상 시간</p>
                <p className="text-sm font-semibold" style={{ color: DARK }}>10~12분</p>
              </div>
            </div>
            <div className="text-xs mb-7" style={{ color: MUTED }}>총 6개 섹션 · 10개 질문</div>
            <button onClick={() => setStep(1)} style={btnStyle}>시작하기 →</button>
            <p className="text-center text-xs mt-4" style={{ color: MUTED }}>신재혁 (Aiges Pontos)</p>
          </div>
        )}

        {/* ── STEP 1: SEO ── */}
        {step === 1 && (
          <div style={CARD} className="p-7">
            <Progress current={1} total={TOTAL_SECTIONS} />
            <SectionHeader label="섹션 1 — SEO 탭" />

            <QBlock num="Q1" question="SEO 탭에서 상품명 추천을 받아보셨을 때, 가장 도움 됐던 점은 무엇이었나요?">
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: MUTED }}>만족도</p>
                <StarRating value={q1Star} onChange={setQ1Star} />
              </div>
              <TextArea value={q1Text} onChange={setQ1Text} placeholder="예) 상품명 후보를 3가지 주는 게 선택하기 편했어요" required />
            </QBlock>

            <QBlock num="Q2" question="SEO 탭에서 부족하거나 더 개선하면 좋겠다 싶은 점은 무엇이었나요?">
              <TextArea value={q2Text} onChange={setQ2Text} placeholder="예) 카테고리별로 다른 추천이 나왔으면 좋겠어요" required />
            </QBlock>

            <button onClick={() => setStep(2)} disabled={!canNext()} style={canNext() ? btnStyle : btnDisabled}>다음 →</button>
          </div>
        )}

        {/* ── STEP 2: 광고 ── */}
        {step === 2 && (
          <div style={CARD} className="p-7">
            <Progress current={2} total={TOTAL_SECTIONS} />
            <SectionHeader
              label="섹션 2 — 광고 탭"
              sub="이지스토리와 가장 큰 변화를 같이 만들 수 있다고 보는 영역입니다."
            />

            <QBlock num="Q3" question="광고 탭에서 추천 키워드·예산 배분을 보셨을 때, 가장 도움 됐던 점은 무엇이었나요?">
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: MUTED }}>만족도</p>
                <StarRating value={q3Star} onChange={setQ3Star} />
              </div>
              <TextArea value={q3Text} onChange={setQ3Text} placeholder="예) 소형·중형 키워드 배분 비율이 실용적이었어요" required />
            </QBlock>

            <QBlock num="Q4" question="광고 탭에서 부족하거나 더 개선하면 좋겠다 싶은 점은 무엇이었나요?">
              <TextArea value={q4Text} onChange={setQ4Text} placeholder="예) 실제 입찰가 데이터가 있으면 더 좋겠어요" required />
            </QBlock>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="py-3.5 rounded-xl font-semibold text-sm flex-1" style={{ background: BG_LIGHT, border: `1px solid ${BORDER}`, color: DARK, cursor: "pointer" }}>← 이전</button>
              <button onClick={() => setStep(3)} disabled={!canNext()} style={{ ...(canNext() ? btnStyle : btnDisabled), flex: 2 }}>다음 →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 가격 ── */}
        {step === 3 && (
          <div style={CARD} className="p-7">
            <Progress current={3} total={TOTAL_SECTIONS} />
            <SectionHeader label="섹션 3 — 가격 탭" />

            <QBlock num="Q5" question="가격 탭에서 추천 판매가를 보셨을 때, 가장 도움 됐던 점은 무엇이었나요?">
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: MUTED }}>만족도</p>
                <StarRating value={q5Star} onChange={setQ5Star} />
              </div>
              <TextArea value={q5Text} onChange={setQ5Text} placeholder="예) 수수료 자동 계산이 편했어요" required />
            </QBlock>

            <QBlock num="Q6" question="가격 탭에서 부족하거나 더 개선하면 좋겠다 싶은 점은 무엇이었나요?">
              <TextArea value={q6Text} onChange={setQ6Text} placeholder="예) 경쟁사 가격이 자동으로 들어왔으면 좋겠어요" required />
            </QBlock>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="py-3.5 rounded-xl font-semibold text-sm flex-1" style={{ background: BG_LIGHT, border: `1px solid ${BORDER}`, color: DARK, cursor: "pointer" }}>← 이전</button>
              <button onClick={() => setStep(4)} disabled={!canNext()} style={{ ...(canNext() ? btnStyle : btnDisabled), flex: 2 }}>다음 →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: 영업·마케팅 ── */}
        {step === 4 && (
          <div style={CARD} className="p-7">
            <Progress current={4} total={TOTAL_SECTIONS} />
            <SectionHeader
              label="섹션 4 — 영업·마케팅 현장 감각"
              sub="다슬님께서 영업·마케팅을 직접 다루시면서 현장에서 보시는 반응이 AI 분석에 가장 가치 있는 입력입니다. 매출 수치는 묻지 않습니다."
            />

            <QBlock num="Q7" question="이지스토리 4개 카테고리 = 다슬님 시각으로 각각 어떤 성격으로 보세요?">
              <div className="mb-3 p-3 rounded-xl text-xs space-y-1" style={{ background: BG_GREEN, color: "#4b7a63" }}>
                <p><strong>카테고리:</strong> 압축팩 · 다리미판 · 화분 · 유아매트</p>
                <p>예시: "다리미판 = 안정적" / "유아매트 = 시즌 영향"</p>
              </div>
              <TextArea value={q7Text} onChange={setQ7Text} placeholder="떠오르시는 대로 편하게 적어주세요" required />
            </QBlock>

            <QBlock num="Q8" question={`"이 상품 = 고객 반응이 좋다" 또는 "반응이 약하다" 싶었던 패턴이 있으셨나요?`}>
              <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: BG_LIGHT, color: MUTED, border: `1px solid ${BORDER}` }}>
                예시: 상품명 / 광고 키워드 / 시즌 / 카테고리 / 가격대<br/>
                매출 수치 X. 다슬님 현장 감각 = 그 자체로 가치 있습니다.
              </div>
              <TextArea value={q8Text} onChange={setQ8Text} placeholder="자유롭게 적어주세요" required />
            </QBlock>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="py-3.5 rounded-xl font-semibold text-sm flex-1" style={{ background: BG_LIGHT, border: `1px solid ${BORDER}`, color: DARK, cursor: "pointer" }}>← 이전</button>
              <button onClick={() => setStep(5)} disabled={!canNext()} style={{ ...(canNext() ? btnStyle : btnDisabled), flex: 2 }}>다음 →</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: 가격 결정 흐름 ── */}
        {step === 5 && (
          <div style={CARD} className="p-7">
            <Progress current={5} total={TOTAL_SECTIONS} />
            <SectionHeader label="섹션 5 — 가격 결정 흐름" />

            <QBlock num="Q9" question="이지스토리 상품 가격 결정 시 보통 어떻게 되세요? (담담히 답해주세요. 정답 없습니다.)">
              <div className="space-y-2.5 mt-2">
                {["다슬님 단독", "다른 부서와 같이", "빈 대표님 컨펌", "다 같이 회의"].map((c) => (
                  <label key={c} className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                    style={{ background: q9Choices.includes(c) ? BG_GREEN : BG_LIGHT, border: `1.5px solid ${q9Choices.includes(c) ? PRIMARY : BORDER}` }}>
                    <input type="checkbox" checked={q9Choices.includes(c)} onChange={() => toggleChoice(c)}
                      className="w-4 h-4 accent-[#00aa6c]" />
                    <span className="text-sm font-medium" style={{ color: DARK }}>{c}</span>
                  </label>
                ))}
                <div className="p-3.5 rounded-xl" style={{ background: BG_LIGHT, border: `1.5px solid ${BORDER}` }}>
                  <label className="flex items-center gap-3 mb-2 cursor-pointer">
                    <input type="checkbox" checked={q9Other.length > 0} onChange={() => { if (q9Other) setQ9Other(""); }} className="w-4 h-4 accent-[#00aa6c]" />
                    <span className="text-sm font-medium" style={{ color: DARK }}>기타</span>
                  </label>
                  <input type="text" value={q9Other} onChange={(e) => setQ9Other(e.target.value)}
                    placeholder="직접 입력해주세요"
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                    style={{ background: "white", border: `1px solid ${BORDER}`, color: DARK }} />
                </div>
              </div>
            </QBlock>

            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="py-3.5 rounded-xl font-semibold text-sm flex-1" style={{ background: BG_LIGHT, border: `1px solid ${BORDER}`, color: DARK, cursor: "pointer" }}>← 이전</button>
              <button onClick={() => setStep(6)} disabled={!canNext()} style={{ ...(canNext() ? btnStyle : btnDisabled), flex: 2 }}>다음 →</button>
            </div>
          </div>
        )}

        {/* ── STEP 6: 자유 ── */}
        {step === 6 && (
          <div style={CARD} className="p-7">
            <Progress current={6} total={TOTAL_SECTIONS} />
            <SectionHeader label="섹션 6 — 자유 (선택)" />

            <QBlock num="Q10 (선택)" question="이외에 SellFit 또는 다음 작업에 대해 떠오르시는 거 자유롭게 적어주세요.">
              <TextArea value={q10Text} onChange={setQ10Text} placeholder="어떤 내용이든 환영합니다" />
            </QBlock>

            {error && (
              <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#fff1f0", border: "1px solid #fca5a5", color: "#dc2626" }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(5)} className="py-3.5 rounded-xl font-semibold text-sm flex-1" style={{ background: BG_LIGHT, border: `1px solid ${BORDER}`, color: DARK, cursor: "pointer" }}>← 이전</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ ...(submitting ? btnDisabled : btnStyle), flex: 2 }}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    제출 중...
                  </span>
                ) : "제출하기 🙏"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 7: 감사 ── */}
        {step === 7 && (
          <div style={CARD} className="p-8 text-center">
            <div className="text-5xl mb-5">🙏</div>
            <h2 className="font-extrabold text-2xl mb-4" style={{ color: DARK }}>답변 잘 받았습니다</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#4b7a63" }}>
              다슬님의 답변을 바탕으로 SellFit 맞춤 셋업을 준비해서<br />
              빈 대표님·다슬님과 다음 미팅에서 보여드리겠습니다.
            </p>
            <div className="p-4 rounded-xl mb-6" style={{ background: BG_GREEN, border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-bold mb-1" style={{ color: PRIMARY }}>다음 단계</p>
              <p className="text-sm" style={{ color: DARK }}>신재혁이 검토 후 연락드리겠습니다.</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: DARK }}>신재혁 (Aiges Pontos)</p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>Aiges Pontos · J&A AI</p>
          </div>
        )}

      </div>
    </div>
  );
}
