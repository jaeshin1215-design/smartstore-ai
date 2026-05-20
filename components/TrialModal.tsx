"use client";

import { useState, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "input" | "success";

export default function TrialModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // open 될 때 localStorage 이메일 자동 채우기 (닫지 않고 편의 제공)
  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem("sellfit_email");
    if (saved) setEmail(saved);
  }, [open]);

  // 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("input");
        setEmail("");
        setError("");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/collect-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("서버 오류");
      localStorage.setItem("sellfit_email", email);
      setStep("success");
    } catch {
      setError("잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: "1px solid #e0ede9" }}
      >
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#00aa6c" }}>
                7일 무료 체험
              </p>
              <h2 className="text-lg font-bold" style={{ color: "#0f2a1e" }}>
                {step === "success" ? "등록 완료!" : "이메일을 입력해 주세요"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-500 text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {step === "input" ? (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "#6b7280" }}>
                7일간 모든 기능을 무료로 사용하세요.
                <br />별도 카드 등록 없이 바로 시작합니다.
              </p>

              {/* 이메일 입력 */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="example@email.com"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    border: error ? "2px solid #ef4444" : "2px solid #e0ede9",
                    color: "#0f2a1e",
                    background: "#fafafa",
                  }}
                />
                {error && (
                  <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>{error}</p>
                )}
              </div>

              {/* 혜택 목록 */}
              <ul className="space-y-1.5">
                {[
                  "트렌드 분석 · SEO · 광고 전략 무제한",
                  "AI 음성 상담 (출시 예정)",
                  "매일 오전 트렌드 리포트",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs" style={{ color: "#4b5563" }}>
                    <span style={{ color: "#00aa6c" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleSubmit}
                disabled={submitting || !email}
                className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "#0f2a1e" }}
              >
                {submitting ? "등록 중..." : "무료 체험 시작하기 →"}
              </button>

              <p className="text-center text-[11px]" style={{ color: "#9ca3af" }}>
                등록 시 이용약관 및 개인정보처리방침에 동의합니다.
              </p>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <p className="font-bold text-base mb-1" style={{ color: "#0f2a1e" }}>
                  7일 무료 체험이 시작됐어요!
                </p>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  <span className="font-semibold" style={{ color: "#00aa6c" }}>{email}</span>
                  <br />으로 안내 메일을 보내드렸습니다.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-white text-sm cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: "#00aa6c" }}
              >
                앱 바로 사용하기 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
