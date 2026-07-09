"use client";

// SellFit 로그인 — 이메일 매직링크 (비밀번호 없음, 초대제)
// 디자인 원칙: 텍스트 흑/회색·흰 배경·카드 1px 보더·버튼만 핑크

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch { /* 동일 안내 유지 */ setSent(true); }
    setSending(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#fff", fontFamily: FF, padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#fff", border: "1px solid #e8eaed",
        borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "36px 32px",
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 6, letterSpacing: "-0.02em" }}>
          SellFit
        </div>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "0 0 24px" }}>
          등록된 이메일로 로그인 링크를 보내드립니다. 비밀번호는 없습니다.
        </p>

        {urlError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
            ⚠ {urlError}
          </div>
        )}

        {sent ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#15803d", lineHeight: 1.6 }}>
            ✓ 등록된 이메일이면 로그인 링크가 발송됐습니다.<br />
            메일함을 확인하세요 (15분간 유효).
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>이메일</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@easystory.kr" autoFocus
              style={{
                width: "100%", boxSizing: "border-box", padding: "12px 14px",
                border: "1px solid #e8eaed", borderRadius: 8, fontSize: 14,
                fontFamily: FF, color: "#111827", outline: "none", marginBottom: 14,
              }}
            />
            <button type="submit" disabled={sending}
              style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "none",
                background: sending ? "#c4c8cc" : "#ef567c", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: sending ? "default" : "pointer", fontFamily: FF,
              }}>
              {sending ? "발송 중..." : "로그인 링크 받기 →"}
            </button>
          </form>
        )}

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20, lineHeight: 1.6 }}>
          초대된 계정만 이용할 수 있습니다. 계정이 필요하면 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
