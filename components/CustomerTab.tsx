"use client";

import { useState, useEffect } from "react";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

interface Chip { label: string; bg: string; border: string; color: string; }
interface AnnoItem {
  id: string;
  date: string;
  views: number;
  impressions: number;
  title: string;
  chips: Chip[];
  para1: string;
  para2: string;
  mockupType: "inquiry" | "positive" | "negative";
  boxBig: string;
  boxSub: string;
  boxKo: string;
  para3: string;
  para4: string;
}

interface SabangnetCS {
  cs_no: string;
  ord_no: string;
  channel: string;
  category: string;
  content: string;
  created_at: string;
  status: "unanswered" | "answered";
}

/* ── Mockup ── */
function InboxMockup({ type, large }: { type: "inquiry" | "positive" | "negative"; large?: boolean }) {
  const accent = type === "positive" ? "#15803d" : type === "negative" ? "#dc2626" : "#1d4ed8";
  const accentBg = type === "positive" ? "#dcfce7" : type === "negative" ? "#fee2e2" : "#dbeafe";
  const label = type === "positive" ? "리뷰 (긍정)" : type === "negative" ? "리뷰 (부정)" : "고객 문의";
  const lines = type === "inquiry"
    ? ["주문 배송 출발 언제쯤...", "내일 꼭 받아야 해요"]
    : type === "positive"
    ? ["자극도 없고 트러블도", "쏙 들어갔어요! 재구매 100%"]
    : ["상자가 찌그러진 채로...", "선물용이라 너무 아쉬워요"];
  return (
    <div style={{ background: "rgba(255,255,255,0.82)", borderRadius: "14px", boxShadow: "0 8px 32px rgba(30,20,60,0.13)", padding: large ? "22px 26px" : "18px 20px", minWidth: large ? "300px" : "240px", maxWidth: large ? "360px" : "280px", backdropFilter: "blur(6px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef567c" }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#374151", letterSpacing: "0.05em" }}>SELLFIT INBOX</span>
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: accentBg, color: accent }}>{label}</span>
          <span style={{ fontSize: "10px", color: "#9ca3af" }}>방금</span>
        </div>
        {lines.map((l, i) => (
          <p key={i} style={{ fontSize: "11px", color: "#374151", margin: i === 0 ? "0 0 3px 0" : 0, fontWeight: i === 0 ? 600 : 400, lineHeight: 1.5 }}>{l}</p>
        ))}
      </div>
      <div style={{ background: "#fff5f7", border: "1px solid #ffd6e0", borderRadius: "6px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#ef567c", flexShrink: 0 }} />
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#ef567c" }}>AI 답변 초안 생성 완료</span>
      </div>
    </div>
  );
}

/* ── GradientBox ── */
function GradientBox({ big, sub, ko, mockupType }: { big: string; sub: string; ko: string; mockupType: "inquiry" | "positive" | "negative" }) {
  const darkColor = mockupType === "negative" ? "#4a0e0e" : mockupType === "positive" ? "#0a2e1a" : "#0d1a3a";
  return (
    <div style={{ borderRadius: "16px", background: "linear-gradient(135deg, #ccd9f0 0%, #ecd4e3 100%)", padding: "48px 52px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "40px", minHeight: "260px" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "44px", fontWeight: 900, color: darkColor, lineHeight: 1.1, margin: "0 0 16px 0", letterSpacing: "-0.03em" }}>{big}</p>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280", lineHeight: 1.6, margin: "0 0 10px 0" }}>{sub}</p>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>{ko}</p>
      </div>
      <div style={{ flexShrink: 0 }}><InboxMockup type={mockupType} large /></div>
    </div>
  );
}

/* ── 리뷰 하드코딩 데이터 (리뷰 대응 섹션 전용) ── */
const REVIEW_ITEMS: AnnoItem[] = [
  {
    id: "a2", date: "2026.05.31", views: 1, impressions: 1,
    title: "피부 타입이 무척 예민해서 걱정했는데 자극도 전혀 없고 트러블도 쏙 들어갔어요! 재구매 의사 100%.",
    chips: [{ label: "리뷰 (긍정)", bg: "#f0fdf4", border: "#86efac", color: "#15803d" }],
    para1: "네이버 쇼핑 리뷰를 통해 접수된 긍정 리뷰입니다. 피부 트러블 개선 효과를 직접 경험한 고객의 강력한 재구매 의향을 확인할 수 있습니다.",
    para2: "아래 원문 리뷰를 확인하고, 감사 답글을 통해 브랜드 신뢰를 강화하세요.",
    mockupType: "positive", boxBig: "Loved It.", boxSub: "Repurchase intent 100% · Sensitive skin", boxKo: "자극 없고 트러블 개선 — 재구매 확정",
    para3: "베스트 후기로 등록하면 신규 고객 전환율 향상에 도움이 됩니다.", para4: "리뷰 답글 작성 바로가기",
  },
  {
    id: "a3", date: "2026.05.30", views: 1, impressions: 1,
    title: "상자 모서리가 다 찌그러지고 뜯어진 채로 도착했네요. 지인 선물용인데 기분이 다소 아쉽습니다.",
    chips: [{ label: "리뷰 (부정)", bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" }],
    para1: "네이버 쇼핑 리뷰를 통해 접수된 부정 리뷰입니다. 포장 파손으로 인한 불만이 접수되었으며, 선물용 상품이었기 때문에 고객 실망도가 높습니다.",
    para2: "즉각적인 사과 답글과 함께 새 상품 무상 제공 또는 환불 처리를 검토하세요.",
    mockupType: "negative", boxBig: "Make It Right.", boxSub: "Damaged on arrival · Gift purchase", boxKo: "포장 파손 — 즉시 사과 & 교환 조치",
    para3: "포장 품질 개선 TF에 해당 사례를 공유하고, 고객센터에 우선 처리 요청을 접수하세요.", para4: "고객센터 처리 현황 확인",
  },
];

type InboxSection = "고객 문의" | "리뷰 대응" | "배송 알림";

export default function CustomerTab() {
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const [activeInboxSection, setActiveInboxSection] = useState<InboxSection>("고객 문의");

  // 사방넷 CS 상태
  const [csItems, setCsItems] = useState<SabangnetCS[]>([]);
  const [csLoading, setCsLoading] = useState(false);
  const [csError, setCsError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const react = (id: string, emoji: string) =>
    setCounts(p => ({ ...p, [id]: { ...(p[id] || {}), [emoji]: ((p[id] || {})[emoji] || 0) + 1 } }));

  useEffect(() => {
    if (activeInboxSection === "고객 문의") fetchCS();
  }, [activeInboxSection]);

  async function fetchCS() {
    setCsLoading(true);
    setCsError(null);
    try {
      const res = await fetch("/api/sabangnet/cs");
      const data = await res.json();
      if (!res.ok) {
        setCsError(data.error ?? "사방넷 CS 조회 실패");
      } else {
        setCsItems(data.cs_list ?? []);
      }
    } catch {
      setCsError("네트워크 오류");
    }
    setCsLoading(false);
  }

  async function generateDraft(cs: SabangnetCS) {
    setGeneratingDraft(cs.cs_no);
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cs.content }),
      });
      const data = await res.json();
      const text = data.reply ?? data.answer ?? data.draft ?? "";
      if (text) setDrafts(p => ({ ...p, [cs.cs_no]: text }));
    } catch { /* 무시 */ }
    setGeneratingDraft(null);
  }

  async function submitAnswer(cs_no: string) {
    const answer = drafts[cs_no]?.trim();
    if (!answer) return;
    setSubmitting(cs_no);
    try {
      const res = await fetch("/api/sabangnet/cs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cs_no, answer }),
      });
      if (res.ok) setSubmitted(p => ({ ...p, [cs_no]: true }));
    } catch { /* 무시 */ }
    setSubmitting(null);
  }

  const SECTION_META: Record<InboxSection, { desc: string }> = {
    "고객 문의": { desc: "사방넷 미답변 문의 자동 수집 · AI 초안 → 즉시 등록" },
    "리뷰 대응": { desc: "긍정/부정 리뷰 분류 · 답글 초안 자동 생성" },
    "배송 알림": { desc: "배송 지연·반품 알림 (준비 중)" },
  };

  return (
    <div style={{ width: "100%", fontFamily: FF, display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* 사이드바 */}
      <div style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed", position: "sticky", top: "60px" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>INBOX</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>고객 목소리, 한곳에서</p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>문의·리뷰·배송 자동 분류</p>
        {(["고객 문의", "리뷰 대응", "배송 알림"] as InboxSection[]).map(f => {
          const isActive = activeInboxSection === f;
          return (
            <div key={f} onClick={() => setActiveInboxSection(f)}
              style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", cursor: "pointer", borderRadius: 6, padding: "4px 6px", background: isActive ? "#fff3f6" : "transparent" }}>
              <span style={{ fontSize: "10px", color: isActive ? "#ef567c" : "#c0c4cc", flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: "13px", color: isActive ? "#ef567c" : "#8f9399", fontWeight: isActive ? 700 : 400 }}>{f}</span>
            </div>
          );
        })}
      </div>

      {/* 메인 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: "1232px", margin: "0 auto", paddingBottom: "80px" }}>

          {/* 헤더 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#111827", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Hear Every Voice.</h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>{SECTION_META[activeInboxSection].desc}</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ fontSize: "13px", fontWeight: 500, padding: "8px 18px", borderRadius: "7px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer", fontFamily: FF, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Filter
              </button>
              {activeInboxSection === "고객 문의" && (
                <button onClick={fetchCS} style={{ fontSize: "13px", fontWeight: 700, padding: "8px 18px", borderRadius: "7px", border: "none", background: "#ef567c", color: "#fff", cursor: "pointer", fontFamily: FF }}>
                  새로고침
                </button>
              )}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "32px" }} />

          {/* ── 고객 문의 섹션 (사방넷 연결) ── */}
          {activeInboxSection === "고객 문의" && (
            <div>
              {/* 로딩 */}
              {csLoading && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                  <div style={{ width: "20px", height: "20px", border: "2px solid #e5e7eb", borderTopColor: "#ef567c", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite", marginBottom: "12px" }} />
                  <p style={{ fontSize: "14px", margin: 0 }}>사방넷 문의 불러오는 중...</p>
                </div>
              )}

              {/* 에러 (키 미설정 포함) */}
              {!csLoading && csError && (
                <div>
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626", margin: "0 0 6px" }}>⚠️ {csError}</p>
                    {csError.includes("미설정") && (
                      <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 10px" }}>
                        .env.local에 <code style={{ background: "#f9fafb", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>SABANGNET_API_KEY</code>, <code style={{ background: "#f9fafb", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>SABANGNET_SHOP_ID</code> 설정 후 활성화됩니다.
                      </p>
                    )}
                    <button onClick={fetchCS} style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: FF }}>
                      다시 시도
                    </button>
                  </div>

                  {/* 에러 시 하드코딩 샘플 미리보기 */}
                  <div style={{ background: "#f9fafb", borderRadius: "12px", border: "1px dashed #e5e7eb", padding: "20px", marginBottom: "24px" }}>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 12px" }}>↓ 사방넷 연결 전 샘플 미리보기 (API 키 설정 후 실제 데이터로 교체됩니다)</p>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px 16px", background: "#fff" }}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8" }}>고객 문의</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>NEW</span>
                      </div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>주문 번호 20260531-0023 배송 출발 언제쯤 되나요? 내일 무조건 받아야 돼요.</p>
                      <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>2026.06.01 · 샘플</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 정상: 문의 없음 */}
              {!csLoading && !csError && csItems.length === 0 && (
                <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
                  <p style={{ fontSize: "32px", margin: "0 0 12px" }}>✓</p>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>미답변 문의 없음</p>
                  <p style={{ fontSize: "14px", margin: 0 }}>사방넷 연동 채널의 모든 문의가 처리됐습니다.</p>
                </div>
              )}

              {/* 정상: 문의 목록 */}
              {!csLoading && !csError && csItems.map((cs, idx) => (
                <div key={cs.cs_no}>
                  <div style={{ display: "flex", gap: "44px" }}>
                    {/* 왼쪽 메타 */}
                    <div style={{ width: "100px", flexShrink: 0, textAlign: "right", paddingTop: "4px" }}>
                      <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500, margin: "0 0 4px" }}>{cs.created_at?.slice(0, 10) ?? "—"}</p>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb" }}>{cs.channel}</span>
                    </div>

                    {/* 오른쪽 콘텐츠 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", lineHeight: 1.5, margin: 0, flex: 1 }}>{cs.content}</h2>
                        <div style={{ display: "flex", gap: "6px", flexShrink: 0, paddingTop: "3px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", whiteSpace: "nowrap" }}>고객 문의</span>
                          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", whiteSpace: "nowrap" }}>{cs.category || "NEW"}</span>
                        </div>
                      </div>

                      <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "16px" }}>주문번호: {cs.ord_no || "—"}</p>

                      {/* 등록 완료 상태 */}
                      {submitted[cs.cs_no] ? (
                        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "18px" }}>✓</span>
                          <div>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: "#15803d", margin: 0 }}>사방넷 답변 등록 완료</p>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>고객에게 답변이 전송됐습니다.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* AI 초안 생성 버튼 */}
                          {!drafts[cs.cs_no] && (
                            <button onClick={() => generateDraft(cs)} disabled={generatingDraft === cs.cs_no}
                              style={{ fontSize: "13px", fontWeight: 600, padding: "9px 18px", borderRadius: "8px", border: "none", background: generatingDraft === cs.cs_no ? "#c4c8cc" : "#ef567c", color: "#fff", cursor: generatingDraft === cs.cs_no ? "default" : "pointer", fontFamily: FF, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                              {generatingDraft === cs.cs_no ? (
                                <><span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> AI 초안 생성 중...</>
                              ) : "✨ AI 답변 초안 생성"}
                            </button>
                          )}

                          {/* 초안 편집 + 등록 */}
                          {drafts[cs.cs_no] !== undefined && (
                            <div style={{ background: "#fff5f7", border: "1px solid #ffd6e0", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                              <p style={{ fontSize: "12px", fontWeight: 700, color: "#ef567c", margin: "0 0 8px" }}>✨ AI 답변 초안 — 수정 후 등록</p>
                              <textarea
                                value={drafts[cs.cs_no]}
                                onChange={e => setDrafts(p => ({ ...p, [cs.cs_no]: e.target.value }))}
                                rows={4}
                                style={{ width: "100%", border: "1px solid #ffd6e0", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#374151", fontFamily: FF, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.7, background: "#fff", marginBottom: "10px" }}
                              />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => submitAnswer(cs.cs_no)} disabled={submitting === cs.cs_no || !drafts[cs.cs_no]?.trim()}
                                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: submitting === cs.cs_no ? "#c4c8cc" : "#ef567c", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: submitting === cs.cs_no ? "default" : "pointer", fontFamily: FF }}>
                                  {submitting === cs.cs_no ? "등록 중..." : "사방넷에 답변 등록 →"}
                                </button>
                                <button onClick={() => generateDraft(cs)} disabled={generatingDraft === cs.cs_no}
                                  style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #ffd6e0", background: "#fff", color: "#ef567c", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: FF, whiteSpace: "nowrap" }}>
                                  재생성
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {idx < csItems.length - 1 && <div style={{ borderTop: "1px solid #e5e7eb", margin: "40px 0" }} />}
                </div>
              ))}
            </div>
          )}

          {/* ── 리뷰 대응 섹션 (기존 하드코딩 유지) ── */}
          {activeInboxSection === "리뷰 대응" && (
            <div>
              {REVIEW_ITEMS.map((item, idx) => {
                const r = counts[item.id] || {};
                return (
                  <div key={item.id}>
                    <div style={{ display: "flex", gap: "44px" }}>
                      <div style={{ width: "100px", flexShrink: 0, textAlign: "right", paddingTop: "4px" }}>
                        <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500, margin: "0 0 8px 0" }}>{item.date}</p>
                        <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 2px 0" }}>{item.views} view</p>
                        <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>{item.impressions} impression</p>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "18px" }}>
                          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", lineHeight: 1.4, margin: 0, flex: 1 }}>{item.title}</h2>
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0, paddingTop: "3px" }}>
                            {item.chips.map((c, ci) => (
                              <span key={ci} style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "6px", background: c.bg, border: `1px solid ${c.border}`, color: c.color, whiteSpace: "nowrap" }}>{c.label}</span>
                            ))}
                          </div>
                        </div>
                        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>{item.para1}</p>
                        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>{item.para2}</p>
                        <GradientBox big={item.boxBig} sub={item.boxSub} ko={item.boxKo} mockupType={item.mockupType} />
                        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "12px" }}>{item.para3}</p>
                        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>
                          <span style={{ color: "#2563eb", textDecoration: "underline", cursor: "pointer" }}>{item.para4}</span>
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {["😊", "😍", "🔥"].map(e => (
                            <button key={e} onClick={() => react(item.id, e)} style={{ fontSize: "15px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "7px", padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontFamily: FF }}>
                              {e}<span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600 }}>{r[e] || 0}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {idx < REVIEW_ITEMS.length - 1 && <div style={{ borderTop: "1px solid #e5e7eb", margin: "52px 0" }} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 배송 알림 섹션 ── */}
          {activeInboxSection === "배송 알림" && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🚚</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>배송 알림 — 준비 중</p>
              <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>배송 지연·반품 자동 알림이 다음 업데이트에 추가됩니다.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
