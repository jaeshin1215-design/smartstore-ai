"use client";

// SellFit 데모 신청 (2026-07-14 Track②) — 이메일만 입력하면 데모 체험 링크 발송.
// 디자인은 /login과 동일 계열: 텍스트 흑/회색·흰 배경·카드 1px 보더·버튼만 핑크

import { useState } from "react";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export default function TryPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "try-page" }),
      });
      const data = await res.json();
      if (res.ok) setSent(true);
      else setError(data.error ?? "요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } catch {
      setError("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    setSending(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#fff", fontFamily: FF, padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e8eaed",
        borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "36px 32px",
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 6, letterSpacing: "-0.02em" }}>
          SellFit 데모 체험
        </div>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 24px" }}>
          이메일만 입력하면 체험 링크를 보내드립니다.<br />
          회원가입·비밀번호 없이, 샘플 데이터로 채워진 데모 화면을 바로 볼 수 있습니다.
        </p>

        {sent ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#15803d", lineHeight: 1.7 }}>
            ✓ 데모 체험 링크를 발송했습니다.<br />
            메일함을 확인해주세요 (링크는 15분간 유효).
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>이메일</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com" autoFocus
              style={{
                width: "100%", boxSizing: "border-box", padding: "12px 14px",
                border: "1px solid #e8eaed", borderRadius: 8, fontSize: 14,
                fontFamily: FF, color: "#111827", outline: "none", marginBottom: 14,
              }}
            />
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 14 }}>
                ⚠ {error}
              </div>
            )}
            <button type="submit" disabled={sending}
              style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "none",
                background: sending ? "#c4c8cc" : "#ef567c", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: sending ? "default" : "pointer", fontFamily: FF,
              }}>
              {sending ? "발송 중..." : "데모 체험 링크 받기 →"}
            </button>
          </form>
        )}

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20, lineHeight: 1.7 }}>
          데모 이용 기간은 첫 입장 후 7일입니다.<br />
          문의: SellFit · 실시간 네이버 데이터 기반 AI 매출 파트너
        </p>
      </div>
    </div>
  );
}
