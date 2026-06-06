"use client";

import { useState } from "react";

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

/* ── Mockup: 오른쪽 UI 카드 (Frill 스크린샷 포지션) ── */
function InboxMockup({ type }: { type: "inquiry" | "positive" | "negative" }) {
  const accent = type === "positive" ? "#15803d" : type === "negative" ? "#dc2626" : "#1d4ed8";
  const accentBg = type === "positive" ? "#dcfce7" : type === "negative" ? "#fee2e2" : "#dbeafe";
  const label = type === "positive" ? "리뷰 (긍정)" : type === "negative" ? "리뷰 (부정)" : "고객 문의";
  const lines = type === "inquiry"
    ? ["주문 배송 출발 언제쯤...", "내일 꼭 받아야 해요"]
    : type === "positive"
    ? ["자극도 없고 트러블도", "쏙 들어갔어요! 재구매 100%"]
    : ["상자가 찌그러진 채로...", "선물용이라 너무 아쉬워요"];

  return (
    <div style={{
      background: "rgba(255,255,255,0.82)",
      borderRadius: "14px",
      boxShadow: "0 8px 32px rgba(30,20,60,0.13)",
      padding: "18px 20px",
      minWidth: "240px",
      maxWidth: "280px",
      backdropFilter: "blur(6px)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef567c" }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#374151", letterSpacing: "0.05em" }}>
          SELLFIT INBOX
        </span>
      </div>

      {/* Mini card */}
      <div style={{
        border: "1px solid #e5e7eb", borderRadius: "8px",
        padding: "12px 14px", marginBottom: "10px", background: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 700, padding: "2px 8px",
            borderRadius: "4px", background: accentBg, color: accent,
          }}>
            {label}
          </span>
          <span style={{ fontSize: "10px", color: "#9ca3af" }}>방금</span>
        </div>
        {lines.map((l, i) => (
          <p key={i} style={{
            fontSize: "11px", color: "#374151", margin: i === 0 ? "0 0 3px 0" : 0,
            fontWeight: i === 0 ? 600 : 400, lineHeight: 1.5,
          }}>{l}</p>
        ))}
      </div>

      {/* AI Draft badge */}
      <div style={{
        background: "#fff5f7", border: "1px solid #ffd6e0",
        borderRadius: "6px", padding: "8px 12px",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#ef567c", flexShrink: 0 }} />
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#ef567c" }}>AI 답변 초안 생성 완료</span>
      </div>
    </div>
  );
}

/* ── Gradient Box: Frill "A Better Way" 포맷 ── */
function GradientBox({ big, sub, ko, mockupType }: {
  big: string; sub: string; ko: string;
  mockupType: "inquiry" | "positive" | "negative";
}) {
  const darkColor = mockupType === "negative" ? "#4a0e0e" : mockupType === "positive" ? "#0a2e1a" : "#0d1a3a";
  return (
    <div style={{
      borderRadius: "16px",
      background: "linear-gradient(135deg, #ccd9f0 0%, #ecd4e3 100%)",
      padding: "52px 56px",
      marginBottom: "28px",
      display: "flex",
      alignItems: "center",
      gap: "48px",
      minHeight: "280px",
    }}>
      {/* Left: Frill-style copy */}
      <div style={{ flex: 1 }}>
        {/* Big headline — Frill "A Better Way To Collect Feedback" 크기 */}
        <p style={{
          fontSize: "42px", fontWeight: 900, color: darkColor,
          lineHeight: 1.15, margin: "0 0 18px 0",
          letterSpacing: "-0.03em",
        }}>
          {big}
        </p>
        {/* English sub */}
        <p style={{
          fontSize: "14px", fontWeight: 500, color: "#6b7280",
          lineHeight: 1.6, margin: "0 0 10px 0",
        }}>
          {sub}
        </p>
        {/* Korean 한 줄 */}
        <p style={{
          fontSize: "13px", fontWeight: 600, color: "#6b7280",
          lineHeight: 1.5, margin: 0,
        }}>
          {ko}
        </p>
      </div>

      {/* Right: UI mockup */}
      <div style={{ flexShrink: 0 }}>
        <InboxMockup type={mockupType} />
      </div>
    </div>
  );
}

/* ── Data ── */
const ITEMS: AnnoItem[] = [
  {
    id: "a1",
    date: "2026.06.01",
    views: 1,
    impressions: 1,
    title: "주문 번호 20260531-0023 배송 출발 언제쯤 되나요? 내일 무조건 받아야 돼요.",
    chips: [
      { label: "고객 문의", bg: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" },
      { label: "NEW",       bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" },
    ],
    para1: "네이버 톡톡 스마트스토어 API를 통해 실시간 수집된 배송 문의입니다. 고객이 내일 수령을 강하게 요구하고 있어 즉각적인 대응이 필요합니다.",
    para2: "아래 메시지를 확인하고 배송사에 우선 배송 요청을 접수하세요.",
    mockupType: "inquiry",
    boxBig: "Ship It Fast.",
    boxSub: "Customer is waiting · Priority shipping",
    boxKo: "내일 도착 요청 — 우선 배송 접수",
    para3: "배송사 측에 우선 배송 요청 접수 후 고객에게 예상 도착일을 안내해 주세요.",
    para4: "스마트스토어 배송 조회 바로가기",
  },
  {
    id: "a2",
    date: "2026.05.31",
    views: 1,
    impressions: 1,
    title: "피부 타입이 무척 예민해서 걱정했는데 자극도 전혀 없고 트러블도 쏙 들어갔어요! 재구매 의사 100%.",
    chips: [
      { label: "리뷰 (긍정)", bg: "#f0fdf4", border: "#86efac", color: "#15803d" },
    ],
    para1: "네이버 쇼핑 리뷰를 통해 접수된 긍정 리뷰입니다. 피부 트러블 개선 효과를 직접 경험한 고객의 강력한 재구매 의향을 확인할 수 있습니다.",
    para2: "아래 원문 리뷰를 확인하고, 감사 답글을 통해 브랜드 신뢰를 강화하세요.",
    mockupType: "positive",
    boxBig: "Loved It.",
    boxSub: "Repurchase intent 100% · Sensitive skin",
    boxKo: "자극 없고 트러블 개선 — 재구매 확정",
    para3: "베스트 후기로 등록하면 신규 고객 전환율 향상에 도움이 됩니다.",
    para4: "리뷰 답글 작성 바로가기",
  },
  {
    id: "a3",
    date: "2026.05.30",
    views: 1,
    impressions: 1,
    title: "상자 모서리가 다 찌그러지고 뜯어진 채로 도착했네요. 지인 선물용인데 기분이 다소 아쉽습니다.",
    chips: [
      { label: "리뷰 (부정)", bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" },
    ],
    para1: "네이버 쇼핑 리뷰를 통해 접수된 부정 리뷰입니다. 포장 파손으로 인한 불만이 접수되었으며, 선물용 상품이었기 때문에 고객 실망도가 높습니다.",
    para2: "즉각적인 사과 답글과 함께 새 상품 무상 제공 또는 환불 처리를 검토하세요.",
    mockupType: "negative",
    boxBig: "Make It Right.",
    boxSub: "Damaged on arrival · Gift purchase",
    boxKo: "포장 파손 — 즉시 사과 & 교환 조치",
    para3: "포장 품질 개선 TF에 해당 사례를 공유하고, 고객센터에 우선 처리 요청을 접수하세요.",
    para4: "고객센터 처리 현황 확인",
  },
];

export default function CustomerTab() {
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const react = (id: string, emoji: string) =>
    setCounts(p => ({ ...p, [id]: { ...(p[id] || {}), [emoji]: ((p[id] || {})[emoji] || 0) + 1 } }));

  return (
    <div style={{ width: "100%", fontFamily: FF, background: "#fff" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "80px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>
            Inbox
          </h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{
              fontSize: "13px", fontWeight: 500, padding: "8px 18px", borderRadius: "7px",
              border: "1px solid #d1d5db", background: "#fff", color: "#374151",
              cursor: "pointer", fontFamily: FF, display: "flex", alignItems: "center", gap: "6px",
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Filter
            </button>
            <button style={{
              fontSize: "13px", fontWeight: 700, padding: "8px 18px", borderRadius: "7px",
              border: "none", background: "#ef567c", color: "#fff",
              cursor: "pointer", fontFamily: FF,
            }}>
              + New
            </button>
          </div>
        </div>

        {/* Subscribe */}
        <button style={{
          fontSize: "13px", fontWeight: 500, padding: "7px 16px", borderRadius: "7px",
          border: "1px solid #d1d5db", background: "#fff", color: "#374151",
          cursor: "pointer", fontFamily: FF, display: "flex", alignItems: "center", gap: "7px",
          marginBottom: "24px",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Subscribe to updates
        </button>

        <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "48px" }} />

        {/* Cards */}
        {ITEMS.map((item, idx) => {
          const r = counts[item.id] || {};
          return (
            <div key={item.id}>
              <div style={{ display: "flex", gap: "44px" }}>

                {/* Left meta */}
                <div style={{ width: "100px", flexShrink: 0, textAlign: "right", paddingTop: "4px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500, margin: "0 0 8px 0" }}>{item.date}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 2px 0" }}>{item.views} view</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{item.impressions} impression</p>
                </div>

                {/* Right content */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* Title + chips */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "18px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", lineHeight: 1.4, margin: 0, flex: 1 }}>
                      {item.title}
                    </h2>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0, paddingTop: "3px" }}>
                      {item.chips.map((c, ci) => (
                        <span key={ci} style={{
                          fontSize: "12px", fontWeight: 600, padding: "4px 11px",
                          borderRadius: "6px", background: c.bg,
                          border: `1px solid ${c.border}`, color: c.color, whiteSpace: "nowrap",
                        }}>{c.label}</span>
                      ))}
                    </div>
                  </div>

                  <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "14px" }}>{item.para1}</p>
                  <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>{item.para2}</p>

                  {/* Gradient box */}
                  <GradientBox
                    big={item.boxBig}
                    sub={item.boxSub}
                    ko={item.boxKo}
                    mockupType={item.mockupType}
                  />

                  <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "12px" }}>{item.para3}</p>
                  <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>
                    <span style={{ color: "#2563eb", textDecoration: "underline", cursor: "pointer" }}>{item.para4}</span>
                  </p>

                  {/* Emoji */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {["😊", "😍", "🔥"].map(e => (
                      <button key={e} onClick={() => react(item.id, e)} style={{
                        fontSize: "15px", background: "#fff", border: "1px solid #e5e7eb",
                        borderRadius: "7px", padding: "5px 12px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "5px", fontFamily: FF,
                      }}>
                        {e}
                        <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600 }}>{r[e] || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {idx < ITEMS.length - 1 && (
                <div style={{ borderTop: "1px solid #e5e7eb", margin: "52px 0" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
