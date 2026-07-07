"use client";

import { useState, useEffect } from "react";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

interface SabangnetCS {
  cs_no: string;
  ord_no: string;
  channel: string;
  category: string;
  content: string;
  created_at: string;
  status: "unanswered" | "answered";
}

interface DefectRecord {
  orderNo: string;
  receivedAt: string;
  channel: "카카오톡 채널" | "대표폰";
  defectType: "교환" | "반품";
  description: string;
  savedAt: string;
}

const SAMPLE_CS_ITEM: SabangnetCS = {
  cs_no: "sample_001",
  ord_no: "20260531-0023",
  channel: "네이버",
  category: "배송 문의",
  content: "주문 번호 20260531-0023 배송 출발 언제쯤 되나요? 내일 무조건 받아야 돼요.",
  created_at: "2026-06-01",
  status: "unanswered",
};

/* ── Inbox Mockup ── */
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

/* ── GradientBox (리뷰용) ── */
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

/* ── InquiryGradientBox (고객 문의용 — 블루 계열) ── */
function InquiryGradientBox({ channel, category }: { channel: string; category: string }) {
  return (
    <div style={{ borderRadius: "16px", background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", padding: "48px 52px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "40px", minHeight: "260px" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "44px", fontWeight: 900, color: "#0d1a3a", lineHeight: 1.1, margin: "0 0 16px 0", letterSpacing: "-0.03em" }}>Reply Fast.</p>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#6b7280", lineHeight: 1.6, margin: "0 0 10px 0" }}>{channel} · {category}</p>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>빠른 답변 → 고객 신뢰 + 재구매율 향상</p>
      </div>
      <div style={{ flexShrink: 0 }}><InboxMockup type="inquiry" large /></div>
    </div>
  );
}

/* ── 리뷰 하드코딩 데이터 ── */
interface AnnoItem {
  id: string; date: string; views: number; impressions: number; title: string;
  chips: { label: string; bg: string; border: string; color: string }[];
  para1: string; para2: string;
  mockupType: "inquiry" | "positive" | "negative";
  boxBig: string; boxSub: string; boxKo: string;
  para3: string; para4: string;
}
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

// ② 배송 알림 삭제 — InboxSection 타입에서 제거
type InboxSection = "고객 문의" | "리뷰 대응";
type CsSubTab = "미답변 문의" | "불량품 접수";

const S_INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
  border: "1px solid #e5e7eb", background: "#fff", outline: "none",
  fontFamily: FF, boxSizing: "border-box",
};

export default function CustomerTab() {
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const [activeInboxSection, setActiveInboxSection] = useState<InboxSection>("고객 문의");
  const [csSubTab, setCsSubTab] = useState<CsSubTab>("미답변 문의");

  // CS 상태
  const [csItems, setCsItems] = useState<SabangnetCS[]>([]);
  const [csLoading, setCsLoading] = useState(false);
  const [csError, setCsError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [urgencies, setUrgencies] = useState<Record<string, "긴급" | "보통">>({});
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  // 리뷰 상태
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [generatingReview, setGeneratingReview] = useState<string | null>(null);
  const [reviewCopied, setReviewCopied] = useState<Record<string, boolean>>({});

  // ⑤ 불량품 접수 상태
  const [defectForm, setDefectForm] = useState<{
    orderNo: string; receivedAt: string;
    channel: "카카오톡 채널" | "대표폰";
    defectType: "교환" | "반품";
    description: string;
  }>({ orderNo: "", receivedAt: "", channel: "카카오톡 채널", defectType: "교환", description: "" });
  const [defectList, setDefectList] = useState<DefectRecord[]>([]);
  const [defectSaved, setDefectSaved] = useState(false);

  const react = (id: string, emoji: string) =>
    setCounts(p => ({ ...p, [id]: { ...(p[id] || {}), [emoji]: ((p[id] || {})[emoji] || 0) + 1 } }));

  useEffect(() => {
    if (activeInboxSection === "고객 문의" && csSubTab === "미답변 문의") fetchCS();
  }, [activeInboxSection, csSubTab]);

  const TEST_MODE = true; // 사방넷 API 키 확보 후 false로 변경

  async function fetchCS() {
    setCsLoading(true);
    setCsError(null);
    try {
      const url = TEST_MODE ? "/api/sabangnet/cs?test=1" : "/api/sabangnet/cs";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) setCsError(data.error ?? "사방넷 CS 조회 실패");
      else setCsItems(data.cs_list ?? []);
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
        body: JSON.stringify({ inquiry: cs.content }),
      });
      if (!res.ok) throw new Error(`reply API ${res.status}`);
      const data = await res.json() as { urgency?: string; reply?: string };
      if (data.reply?.trim()) setDrafts(p => ({ ...p, [cs.cs_no]: data.reply!.trim() }));
      if (data.urgency === "긴급" || data.urgency === "보통") {
        setUrgencies(p => ({ ...p, [cs.cs_no]: data.urgency as "긴급" | "보통" }));
      }
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

  async function generateReviewDraft(item: AnnoItem) {
    setGeneratingReview(item.id);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: item.title, type: item.mockupType === "positive" ? "positive" : "negative" }),
      });
      if (!res.ok) throw new Error(`review API ${res.status}`);
      const text = await res.text();
      if (text.trim()) setReviewDrafts(p => ({ ...p, [item.id]: text.trim() }));
    } catch { /* 무시 */ }
    setGeneratingReview(null);
  }

  async function copyReviewDraft(id: string) {
    const text = reviewDrafts[id];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setReviewCopied(p => ({ ...p, [id]: true }));
    setTimeout(() => setReviewCopied(p => ({ ...p, [id]: false })), 2000);
  }

  function saveDefect() {
    if (!defectForm.orderNo.trim() || !defectForm.description.trim()) return;
    const record: DefectRecord = {
      ...defectForm,
      savedAt: new Date().toLocaleDateString("ko-KR"),
    };
    setDefectList(p => [record, ...p]);
    setDefectForm({ orderNo: "", receivedAt: "", channel: "카카오톡 채널", defectType: "교환", description: "" });
    setDefectSaved(true);
    setTimeout(() => setDefectSaved(false), 2500);
  }

  // ② 배송 알림 제거
  const SECTION_META: Record<InboxSection, { desc: string }> = {
    "고객 문의": { desc: "사방넷 연동 채널 문의만 자동 수집 · AI 초안 → 즉시 등록" },
    "리뷰 대응": { desc: "긍정/부정 리뷰 분류 · 답글 초안 자동 생성" },
  };

  function renderCSItem(cs: SabangnetCS, idx: number, total: number, isSample: boolean) {
    return (
      <div key={cs.cs_no}>
        <div style={{ display: "flex", gap: "44px" }}>
          <div style={{ width: "100px", flexShrink: 0, textAlign: "right", paddingTop: "4px" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500, margin: "0 0 8px 0" }}>
              {cs.created_at?.slice(0, 10)?.replace(/-/g, ".") ?? "—"}
            </p>
            {isSample ? (
              <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 2px 0" }}>샘플</p>
            ) : (
              <>
                <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 2px 0" }}>1 view</p>
                <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>{cs.channel}</p>
              </>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", lineHeight: 1.4, margin: 0, flex: 1 }}>
                {cs.content}
              </h2>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0, paddingTop: "3px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", whiteSpace: "nowrap" }}>고객 문의</span>
                <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", whiteSpace: "nowrap" }}>{cs.category || "NEW"}</span>
                {urgencies[cs.cs_no] && (
                  <span style={{
                    fontSize: "12px", fontWeight: 600, padding: "4px 11px", borderRadius: "6px", whiteSpace: "nowrap",
                    background: urgencies[cs.cs_no] === "긴급" ? "#fff8f0" : "#f9fafb",
                    border: `1px solid ${urgencies[cs.cs_no] === "긴급" ? "#fb923c" : "#d1d5db"}`,
                    color: urgencies[cs.cs_no] === "긴급" ? "#c2410c" : "#6b7280",
                  }}>
                    {urgencies[cs.cs_no] === "긴급" ? "⚡ 긴급" : "보통"}
                  </span>
                )}
              </div>
            </div>

            {/* ③ 오타 수정: 을→를 */}
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>
              {cs.channel || "쇼핑 채널"}를 통해 접수된 고객 문의입니다. 빠른 답변으로 고객 신뢰와 재구매율을 높이세요.
            </p>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>
              주문번호: {cs.ord_no || "—"}{isSample ? " (샘플 미리보기)" : " — AI 초안을 확인하고 수정 후 사방넷에 즉시 등록하세요."}
            </p>

            <InquiryGradientBox channel={cs.channel || "채널"} category={cs.category || "배송 문의"} />

            {isSample ? (
              <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>
                API 키 설정 후 실제 문의에 AI 초안을 생성하고 사방넷에 바로 등록할 수 있습니다.
              </p>
            ) : submitted[cs.cs_no] ? (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "16px 20px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>✓</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#15803d", margin: 0 }}>사방넷 답변 등록 완료</p>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>고객에게 답변이 전송됐습니다.</p>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: "28px" }}>
                {/* 작업 2 — 교환·반품 SCM 안내 배너 */}
                {cs.category === "교환·반품" && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#c2410c", flexShrink: 0 }}>⚠</span>
                    <span style={{ fontSize: "13px", color: "#c2410c", fontWeight: 600 }}>교환 승인 후 자동 처리 불가 — 재발송 송장은 SCM에서 직접 등록하세요</span>
                  </div>
                )}
                {!drafts[cs.cs_no] && (
                  <button onClick={() => generateDraft(cs)} disabled={generatingDraft === cs.cs_no}
                    style={{ fontSize: "13px", fontWeight: 600, padding: "9px 20px", borderRadius: "8px", border: "none", background: generatingDraft === cs.cs_no ? "#c4c8cc" : "#ef567c", color: "#fff", cursor: generatingDraft === cs.cs_no ? "default" : "pointer", fontFamily: FF, display: "flex", alignItems: "center", gap: "6px" }}>
                    {generatingDraft === cs.cs_no
                      ? <><span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> 초안 생성 중...</>
                      : "✨ AI 답변 초안 생성"}
                  </button>
                )}
                {drafts[cs.cs_no] !== undefined && (
                  <div style={{ background: "#fff5f7", border: "1px solid #ffd6e0", borderRadius: "12px", padding: "16px" }}>
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
                        style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #ffd6e0", background: "#fff", color: "#ef567c", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: FF }}>
                        재생성
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {["😊", "😍", "🔥"].map(e => (
                <button key={e} onClick={() => react(cs.cs_no, e)}
                  style={{ fontSize: "15px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "7px", padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontFamily: FF }}>
                  {e}<span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600 }}>{(counts[cs.cs_no] || {})[e] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {idx < total - 1 && <div style={{ borderTop: "1px solid #e5e7eb", margin: "52px 0" }} />}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", fontFamily: FF, display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* 사이드바 — ② 배송 알림 제거, 사이드바 설명 수정 */}
      <div style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed", position: "sticky", top: "60px" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>INBOX</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>고객 목소리, 한곳에서</p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>문의·리뷰 자동 분류</p>
        {(["고객 문의", "리뷰 대응"] as InboxSection[]).map(f => {
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
              {activeInboxSection === "고객 문의" && csSubTab === "미답변 문의" && (
                <button onClick={fetchCS} style={{ fontSize: "13px", fontWeight: 700, padding: "8px 18px", borderRadius: "7px", border: "none", background: "#ef567c", color: "#fff", cursor: "pointer", fontFamily: FF }}>
                  새로고침
                </button>
              )}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "28px" }} />

          {/* ── 고객 문의 섹션 ── */}
          {activeInboxSection === "고객 문의" && (
            <div>
              {/* ④ 채널 범위 표기 */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", padding: "8px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "#0369a1" }}>ℹ</span>
                <span style={{ fontSize: "13px", color: "#0369a1" }}>사방넷 연동 채널 문의만 자동 수집됩니다 (수기채널 제외)</span>
              </div>
              {/* 작업 3 — 사방넷 미수집 채널 확인 필요 배너 */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", padding: "8px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "#c2410c" }}>⚠</span>
                <span style={{ fontSize: "13px", color: "#92400e" }}>사방넷 미수집 채널 존재 가능 — 수기채널 문의는 이 목록에 안 뜹니다. SCM 직접 확인 권장</span>
              </div>

              {/* 서브탭: 미답변 문의 | 불량품 접수 */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "#f3f4f6", borderRadius: "10px", padding: "4px" }}>
                {(["미답변 문의", "불량품 접수"] as CsSubTab[]).map(t => (
                  <button key={t} onClick={() => setCsSubTab(t)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: "7px", border: "none", background: csSubTab === t ? "#fff" : "transparent", color: csSubTab === t ? "#111827" : "#9ca3af", fontSize: "13px", fontWeight: csSubTab === t ? 700 : 500, cursor: "pointer", fontFamily: FF, boxShadow: csSubTab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                    {t}
                    {t === "불량품 접수" && defectList.length > 0 && (
                      <span style={{ marginLeft: "5px", fontSize: "11px", background: "#ef567c", color: "#fff", borderRadius: "10px", padding: "1px 6px" }}>{defectList.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── 서브탭: 미답변 문의 ── */}
              {csSubTab === "미답변 문의" && (
                <>
                  {csLoading && (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                      <div style={{ width: "20px", height: "20px", border: "2px solid #e5e7eb", borderTopColor: "#ef567c", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite", marginBottom: "12px" }} />
                      <p style={{ fontSize: "14px", margin: 0 }}>사방넷 문의 불러오는 중...</p>
                    </div>
                  )}

                  {!csLoading && csError && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: csError.includes("미설정") ? "#fffbeb" : "#fef2f2", border: `1px solid ${csError.includes("미설정") ? "#fde68a" : "#fecaca"}`, borderRadius: "8px", marginBottom: "40px" }}>
                      <span style={{ fontSize: "13px", color: csError.includes("미설정") ? "#92400e" : "#dc2626" }}>
                        ⚠️ {csError}{csError.includes("미설정") ? " — 아래는 샘플 미리보기입니다" : ""}
                      </span>
                      <button onClick={fetchCS}
                        style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${csError.includes("미설정") ? "#fde68a" : "#fecaca"}`, background: "#fff", color: csError.includes("미설정") ? "#92400e" : "#dc2626", cursor: "pointer", fontFamily: FF }}>
                        다시 시도
                      </button>
                    </div>
                  )}

                  {!csLoading && csError && renderCSItem(SAMPLE_CS_ITEM, 0, 1, true)}

                  {!csLoading && !csError && csItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
                      <p style={{ fontSize: "32px", margin: "0 0 12px" }}>✓</p>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>미답변 문의 없음</p>
                      <p style={{ fontSize: "14px", margin: 0 }}>사방넷 연동 채널의 모든 문의가 처리됐습니다.</p>
                    </div>
                  )}

                  {!csLoading && !csError && csItems.map((cs, idx) => renderCSItem(cs, idx, csItems.length, false))}
                </>
              )}

              {/* ⑤ 서브탭: 불량품 접수 (수동) */}
              {csSubTab === "불량품 접수" && (
                <div>
                  {/* 안내 배너 */}
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", padding: "14px 18px", marginBottom: "24px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#c2410c", margin: "0 0 4px" }}>📱 카카오톡 채널 / 대표폰 접수 전용</p>
                    <p style={{ fontSize: "13px", color: "#92400e", margin: 0, lineHeight: 1.6 }}>
                      고객으로부터 불량 사유 이미지·영상을 받은 후 아래 폼에 수동 입력하세요. 사방넷과 별개로 운영됩니다.
                    </p>
                  </div>

                  {/* 입력 폼 */}
                  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 18px" }}>불량품 접수 입력</p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>주문번호 *</label>
                        <input style={S_INPUT} placeholder="예) 20260701-0041"
                          value={defectForm.orderNo} onChange={e => setDefectForm(p => ({ ...p, orderNo: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>접수 날짜</label>
                        <input style={S_INPUT} type="date"
                          value={defectForm.receivedAt} onChange={e => setDefectForm(p => ({ ...p, receivedAt: e.target.value }))} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>접수 경로</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {(["카카오톡 채널", "대표폰"] as const).map(v => (
                            <button key={v} onClick={() => setDefectForm(p => ({ ...p, channel: v }))}
                              style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FF, borderColor: defectForm.channel === v ? "#c2410c" : "#e5e7eb", background: defectForm.channel === v ? "#fff7ed" : "#fff", color: defectForm.channel === v ? "#c2410c" : "#6b7280" }}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>처리 유형</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {(["교환", "반품"] as const).map(v => (
                            <button key={v} onClick={() => setDefectForm(p => ({ ...p, defectType: v }))}
                              style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FF, borderColor: defectForm.defectType === v ? "#1d4ed8" : "#e5e7eb", background: defectForm.defectType === v ? "#eff6ff" : "#fff", color: defectForm.defectType === v ? "#1d4ed8" : "#6b7280" }}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>불량 사유 *</label>
                      <textarea rows={3} placeholder="예) 제품 봉합 부위 실밥 풀림, 색상 얼룩 발생 등" style={{ ...S_INPUT, resize: "vertical", lineHeight: 1.7 }}
                        value={defectForm.description} onChange={e => setDefectForm(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>
                      📎 이미지·영상은 카카오톡/대표폰으로 별도 수령 후 주문번호와 함께 보관하세요. 자동 첨부는 미지원.
                    </div>

                    <button onClick={saveDefect} disabled={!defectForm.orderNo.trim() || !defectForm.description.trim()}
                      style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "none", background: (!defectForm.orderNo.trim() || !defectForm.description.trim()) ? "#e5e7eb" : defectSaved ? "#15803d" : "#ef567c", color: (!defectForm.orderNo.trim() || !defectForm.description.trim()) ? "#9ca3af" : "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FF, transition: "background 0.2s" }}>
                      {defectSaved ? "✓ 저장 완료" : "불량품 접수 저장 →"}
                    </button>
                  </div>

                  {/* 저장된 접수 목록 */}
                  {defectList.length > 0 && (
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>접수 기록 ({defectList.length}건)</p>
                      {defectList.map((d, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: i < defectList.length - 1 ? "1px solid #f3f4f6" : "none", gap: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{d.orderNo}</span>
                              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: d.defectType === "교환" ? "#eff6ff" : "#fef2f2", color: d.defectType === "교환" ? "#1d4ed8" : "#dc2626" }}>{d.defectType}</span>
                              <span style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: "10px" }}>{d.channel}</span>
                            </div>
                            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>{d.description}</p>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>{d.savedAt}</p>
                            {d.receivedAt && <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>접수 {d.receivedAt}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 리뷰 대응 섹션 ── */}
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

                        {!reviewDrafts[item.id] ? (
                          <button onClick={() => generateReviewDraft(item)} disabled={generatingReview === item.id}
                            style={{ fontSize: "13px", fontWeight: 600, padding: "9px 20px", borderRadius: "8px", border: "none", background: generatingReview === item.id ? "#c4c8cc" : "#ef567c", color: "#fff", cursor: generatingReview === item.id ? "default" : "pointer", fontFamily: FF, display: "flex", alignItems: "center", gap: "6px", marginBottom: "28px" }}>
                            {generatingReview === item.id
                              ? <><span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> 초안 생성 중...</>
                              : "✨ AI 답글 초안 생성"}
                          </button>
                        ) : (
                          <div style={{ background: "#fff5f7", border: "1px solid #ffd6e0", borderRadius: "12px", padding: "16px", marginBottom: "28px" }}>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#ef567c", margin: "0 0 8px" }}>✨ AI 답글 초안 — 수정 후 네이버 쇼핑에 직접 붙여넣기</p>
                            <textarea
                              value={reviewDrafts[item.id]}
                              onChange={e => setReviewDrafts(p => ({ ...p, [item.id]: e.target.value }))}
                              rows={4}
                              style={{ width: "100%", border: "1px solid #ffd6e0", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#374151", fontFamily: FF, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.7, background: "#fff", marginBottom: "10px" }}
                            />
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => copyReviewDraft(item.id)}
                                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: reviewCopied[item.id] ? "#15803d" : "#ef567c", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FF, transition: "background 0.2s" }}>
                                {reviewCopied[item.id] ? "✓ 복사 완료" : "답글 복사 →"}
                              </button>
                              <button onClick={() => generateReviewDraft(item)} disabled={generatingReview === item.id}
                                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #ffd6e0", background: "#fff", color: "#ef567c", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: FF }}>
                                재생성
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {["😊", "😍", "🔥"].map(e => (
                            <button key={e} onClick={() => react(item.id, e)}
                              style={{ fontSize: "15px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "7px", padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontFamily: FF }}>
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

        </div>
      </div>
    </div>
  );
}
