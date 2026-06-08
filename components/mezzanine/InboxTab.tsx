"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";

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
  mockupType: "positive" | "conditional" | "noreply";
  boxBig: string;
  boxSub: string;
  boxKo: string;
  para3: string;
  para4: string;
}

function InboxMockup({ type }: { type: "positive" | "conditional" | "noreply" }) {
  const accent =
    type === "positive"    ? "#15803d" :
    type === "conditional" ? "#92400e" : "#1d4ed8";
  const accentBg =
    type === "positive"    ? "#dcfce7" :
    type === "conditional" ? "#fef9c3" : "#dbeafe";
  const label =
    type === "positive"    ? "긍정 회신" :
    type === "conditional" ? "조건 회신" : "무응답";
  const lines =
    type === "positive"
      ? ["일정 협의 가능합니다,", "6월 마지막 주 어떤가요?"]
      : type === "conditional"
      ? ["설치 비용 지원 가능한지", "여쭤봐도 될까요?"]
      : ["3일 경과 — 후속 컨택 예정", ""];

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
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b4fd8" }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#374151", letterSpacing: "0.05em" }}>
          AIGES PONTOS
        </span>
      </div>
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
        {lines.map((l, i) => l ? (
          <p key={i} style={{
            fontSize: "11px", color: "#374151", margin: i === 0 ? "0 0 3px 0" : 0,
            fontWeight: i === 0 ? 600 : 400, lineHeight: 1.5,
          }}>{l}</p>
        ) : null)}
      </div>
      <div style={{
        background: "#f0f4ff", border: "1px solid #c7d2fe",
        borderRadius: "6px", padding: "8px 12px",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "2px", background: "#3b4fd8", flexShrink: 0 }} />
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#3b4fd8" }}>입점 제안 초안 생성 완료</span>
      </div>
    </div>
  );
}

function GradientBox({ big, sub, ko, mockupType }: {
  big: string; sub: string; ko: string;
  mockupType: "positive" | "conditional" | "noreply";
}) {
  const darkColor =
    mockupType === "positive"    ? "#0a2e1a" :
    mockupType === "conditional" ? "#2e1f0a" : "#0d1a3a";
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
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: "42px", fontWeight: 900, color: darkColor,
          lineHeight: 1.15, margin: "0 0 18px 0",
          letterSpacing: "-0.03em",
        }}>
          {big}
        </p>
        <p style={{
          fontSize: "14px", fontWeight: 500, color: "#6b7280",
          lineHeight: 1.6, margin: "0 0 10px 0",
        }}>
          {sub}
        </p>
        <p style={{
          fontSize: "13px", fontWeight: 600, color: "#6b7280",
          lineHeight: 1.5, margin: 0,
        }}>
          {ko}
        </p>
      </div>
      <div style={{ flexShrink: 0 }}>
        <InboxMockup type={mockupType} />
      </div>
    </div>
  );
}

const ITEMS: AnnoItem[] = [
  {
    id: "m1",
    date: "D+2",
    views: 1, impressions: 1,
    title: "[웰니스·아로마 후보] — \"일정 협의 가능합니다, 6월 마지막 주 어떤가요?\"",
    chips: [
      { label: "긍정 회신", bg: "#f0fdf4", border: "#86efac", color: "#15803d" },
      { label: "NEW", bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" },
    ],
    para1: "발굴 엔진이 선정한 서북권 밀착 아로마·웰니스 D2C 후보로부터 입점 관심 회신이 접수됐습니다. 6월 마지막 주 일정 협의 의향을 확인한 상태입니다.",
    para2: "아래 메시지를 확인하고 미팅 일정 및 제안서 초안을 준비하세요.",
    mockupType: "positive",
    boxBig: "Brand Matched.",
    boxSub: "Positive response · Schedule negotiation",
    boxKo: "일정 협의 가능 — 미팅 제안 준비",
    para3: "Diagnose 탭에서 진단 근거를 확인하고, Optimize 탭으로 입점 경제성 시뮬레이션을 준비하세요.",
    para4: "Diagnose 매트릭스에서 진단 보기",
  },
  {
    id: "m2",
    date: "D+3",
    views: 1, impressions: 1,
    title: "[감성 소품·인센스 후보] — \"설치 비용 지원 가능한지 여쭤봐도 될까요?\"",
    chips: [
      { label: "조건 회신", bg: "#fefce8", border: "#fde68a", color: "#92400e" },
    ],
    para1: "인증샷 화제성이 높고 콜라보 마켓 참여가 잦은 감성 소품 후보로부터 조건부 관심 회신이 접수됐습니다. 설치 비용 지원 여부가 핵심 조건입니다.",
    para2: "아래 메시지를 확인하고 설치 비용 분담 조건을 검토하세요.",
    mockupType: "conditional",
    boxBig: "Let's Talk Terms.",
    boxSub: "Conditional interest · Installation cost",
    boxKo: "조건부 관심 — 설치 비용 협의 필요",
    para3: "Optimize 탭에서 설치비(CapEx) 항목을 포함한 P&L 시뮬레이션을 함께 확인하세요.",
    para4: "Optimize 입점 경제성 시뮬레이터 보기",
  },
  {
    id: "m3",
    date: "D+3",
    views: 1, impressions: 1,
    title: "[바디케어 D2C 후보] — 3일 경과, 후속 컨택 예정",
    chips: [
      { label: "무응답", bg: "#f9fafb", border: "#e5e7eb", color: "#6b7280" },
    ],
    para1: "성수 검증·팔로워 1만대·오프라인 쇼룸 없음으로 필터를 통과한 바디케어 D2C 후보입니다. 초기 컨택 후 3일이 경과했으나 회신이 없는 상태입니다.",
    para2: "아래 메시지를 확인하고 후속 컨택 채널(인스타 DM 또는 이메일)을 선택하세요.",
    mockupType: "noreply",
    boxBig: "Follow Up.",
    boxSub: "No reply · 3 days elapsed",
    boxKo: "3일 무응답 — 후속 컨택 채널 선택",
    para3: "후속 컨택 시 '공간이 아쉬운 브랜드'라는 발굴 근거를 제안서에 명시하면 응답률이 높아집니다.",
    para4: "제안 초안 다시 생성하기",
  },
];

// para4 클릭 시 이동할 탭
const PARA4_TARGET: Record<string, string> = {
  m1: "diagnose",
  m2: "optimize",
  m3: "diagnose",
};

interface Props {
  onNavigate: (tabId: string) => void;
}

export default function InboxTab({ onNavigate }: Props) {
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
              border: "none", background: "#3b4fd8", color: "#fff",
              cursor: "pointer", fontFamily: FF,
            }}>
              + New
            </button>
          </div>
        </div>

        {/* DemoBadge */}
        <DemoBadge note="예시 데이터 — 파일럿 시작 시 실제 회신이 이렇게 분류·축적됩니다. 현재 실회신 0건." />

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
                    <span
                      onClick={() => onNavigate(PARA4_TARGET[item.id] ?? "diagnose")}
                      style={{ color: "#3b4fd8", textDecoration: "underline", cursor: "pointer" }}
                    >
                      {item.para4}
                    </span>
                  </p>

                  {/* Emoji reactions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {["😊", "🤝", "🔥"].map(e => (
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
