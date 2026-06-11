"use client";

import { useState, useEffect } from "react";
import DiagnosisTab from "@/components/DiagnosisTab";
import SetupTab     from "@/components/mezzanine/SetupTab";
import InboxTab     from "@/components/mezzanine/InboxTab";
import DiscoverTab  from "@/components/mezzanine/DiscoverTab";
import OptimizeTab  from "@/components/mezzanine/OptimizeTab";
import CalendarTab  from "@/components/mezzanine/CalendarTab";
import { FONT_BODY, COLOR_INK, COLOR_RULE, COLOR_BG, COLOR_SUB, TEXT_NAV_SIZE, TEXT_CAPTION_SIZE, TRACKING_OVERLINE } from "@/lib/tokens";

const MEZZANINE_STORE_ID = "mezzanine-demo-001";

const TABS = [
  { id: "calendar",  label: "Calendar",  icon: "calendar"     },
  { id: "setup",     label: "Setup",     icon: "settings"     },
  { id: "discover",  label: "Discover",  icon: "compass"      },
  { id: "diagnose",  label: "Diagnose",  icon: "layout-grid"  },
  { id: "inbox",     label: "Inbox",     icon: "inbox"        },
  { id: "optimize",  label: "Optimize",  icon: "adjustments"  },
] as const;

type TabId = typeof TABS[number]["id"];

interface MezzaninePipeline {
  selectedCategory: { id: string; label: string; matchRate: number | null; } | null;
  selectedBrand:    { id: string; name: string; category: string; matrix_x: number; matrix_y: number; } | null;
  filter:           { category: string; dong: string; season: string; };
}

export default function MezzaninePage() {
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [ready,     setReady]     = useState(false);
  const [pipeline,  setPipeline]  = useState<MezzaninePipeline>({
    selectedCategory: null,
    selectedBrand:    null,
    filter:           { category: "all", dong: "all", season: "all" },
  });

  const isFullHeight = activeTab === "diagnose";

  const navigate = (tabId: TabId, updates?: Partial<MezzaninePipeline>) => {
    if (updates) setPipeline(prev => ({ ...prev, ...updates }));
    setActiveTab(tabId);
  };

  useEffect(() => {
    async function init() {
      try {
        await fetch("/api/db/init",                     { method: "POST" });
        await fetch("/api/db/migrate",                  { method: "POST" });
        await fetch("/api/db/migrate-mezzanine-brands", { method: "POST" });
        await fetch("/api/db/migrate-brands-v2",        { method: "POST" });
        await fetch("/api/db/seed-mezzanine",           { method: "POST" });
      } catch { /* ignore */ }
      localStorage.setItem("mezzanine_store_id", MEZZANINE_STORE_ID);
      setReady(true);
    }
    init();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: COLOR_BG, fontFamily: FONT_BODY }}>

      {/* ── 헤더 ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: `1px solid ${COLOR_RULE}`,
        height: "44px",
        display: "flex",
        alignItems: "center",
      }}>
        {/* 로고 */}
        <div style={{
          padding: "0 16px",
          display: "flex", alignItems: "center", gap: "6px",
          borderRight: `1px solid ${COLOR_RULE}`,
          height: "44px", flexShrink: 0,
        }}>
          <span style={{
            fontSize: "14px", fontWeight: 800, color: COLOR_INK,
            letterSpacing: "-0.03em", fontFamily: FONT_BODY,
          }}>
            MEZZANINE
          </span>
          <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>북가좌</span>
        </div>

        {/* 탭 */}
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: "44px", padding: "0 14px",
                display: "flex", alignItems: "center", gap: "6px",
                border: "none", background: "none", cursor: "pointer",
                fontFamily: FONT_BODY,
                borderBottom: isActive ? `2px solid ${COLOR_INK}` : "2px solid transparent",
                flexShrink: 0,
              }}
            >
              <i className={`ti ti-${tab.icon}`} style={{ fontSize: "14px", color: isActive ? COLOR_INK : COLOR_SUB }} />
              <span style={{ fontSize: TEXT_NAV_SIZE, fontWeight: isActive ? 500 : 400, color: isActive ? COLOR_INK : COLOR_SUB, letterSpacing: "-0.01em", fontFamily: FONT_BODY }}>
                {tab.label}
              </span>
              {tab.id === "discover" && pipeline.selectedCategory && (
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: COLOR_INK, display: "inline-block" }} />
              )}
              {tab.id === "diagnose" && pipeline.selectedBrand && (
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: COLOR_INK, display: "inline-block" }} />
              )}
            </button>
          );
        })}

        {/* 우측 배지 */}
        <div style={{ marginLeft: "auto", padding: "0 16px", flexShrink: 0 }}>
          <span style={{
            fontSize: TEXT_CAPTION_SIZE, fontWeight: 400, padding: "2px 10px", borderRadius: "9px",
            background: "#f3f4f6", color: COLOR_SUB,
            letterSpacing: TRACKING_OVERLINE, fontFamily: FONT_BODY,
          }}>
            INTERNAL DEMO · 2026.06
          </span>
        </div>
      </header>

      {/* ── 메인 ── */}
      <main style={isFullHeight
        ? { height: "calc(100vh - 44px)", overflow: "hidden" }
        : { padding: "28px 24px 48px", minHeight: "calc(100vh - 44px - 220px)" }
      }>
        {!ready ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: COLOR_SUB, fontSize: "13px", fontFamily: FONT_BODY }}>
            데모 데이터 초기화 중...
          </div>
        ) : (
          <>
            {activeTab === "calendar" && (
              <CalendarTab
                filter={pipeline.filter}
                onNavigate={(tabId, updates) => navigate(tabId as TabId, updates as Partial<MezzaninePipeline>)}
                onFilterChange={f => setPipeline(prev => ({ ...prev, filter: f }))}
              />
            )}
            {activeTab === "setup" && (
              <SetupTab
                filter={pipeline.filter}
                onFilterChange={filter => {
                  setPipeline(prev => ({ ...prev, filter }));
                  navigate("diagnose" as TabId);
                }}
                onBrandAdded={() => navigate("diagnose" as TabId)}
              />
            )}
            {activeTab === "discover" && (
              <DiscoverTab
                onSelectCategory={cat => setPipeline(prev => ({ ...prev, selectedCategory: cat }))}
                onNavigate={(tabId, updates) => navigate(tabId as TabId, updates)}
                initialCategory={pipeline.filter.category !== "all" ? pipeline.filter.category : undefined}
              />
            )}
            {activeTab === "diagnose" && (
              <DiagnosisTab
                mode="mezzanine"
                highlightCategory={pipeline.selectedCategory?.id}
                onSelectBrand={brand => setPipeline(prev => ({ ...prev, selectedBrand: brand }))}
                onNavigate={tabId => navigate(tabId as TabId)}
                filter={pipeline.filter}
              />
            )}
            {activeTab === "inbox" && (
              <InboxTab onNavigate={tabId => navigate(tabId as TabId)} />
            )}
            {activeTab === "optimize" && (
              <OptimizeTab selectedBrand={pipeline.selectedBrand} />
            )}
          </>
        )}
      </main>

      {/* ── Footer (Diagnose fullHeight 시 숨김) ── */}
      {!isFullHeight && (
        <footer style={{ background: "#111", padding: "40px 60px 32px", fontFamily: FONT_BODY }}>
          {/* 로고 */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
              AIGES PONTOS
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "3px 0 0", letterSpacing: "0.06em" }}>
              Mezzanine 북가좌 · AI 입점 매칭 데모
            </p>
          </div>

          {/* 3열 */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "36px", flexWrap: "wrap", width: "100%" }}>
            {[
              {
                title: "ABOUT US",
                items: ["Aiges Pontos", "Mezzanine 북가좌", "AI 입점 매칭 시스템"],
              },
              {
                title: "DEMO INFO",
                items: ["캘린더형 입점 매칭", "AI 발굴 + 현장 판단", "내부 데모 문서"],
              },
              {
                title: "CONTACT",
                items: ["미팅 문의 — 내부 데모", "공개 예정", ""],
              },
            ].map(col => (
              <div key={col.title}>
                <p style={{
                  fontSize: "10px", fontWeight: 700,
                  color: "#ffffff", letterSpacing: "0.12em",
                  textTransform: "uppercase", margin: "0 0 12px",
                }}>
                  {col.title}
                </p>
                {col.items.map((item, i) => (
                  <p key={i} style={{
                    fontSize: "12px", color: "rgba(255,255,255,0.5)",
                    margin: "0 0 6px", lineHeight: 1.6,
                  }}>
                    {item}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* 서명 */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.8 }}>
              Published by Aiges Pontos · First in concrete. Now in code.
              <br />
              메자닌 북가좌 · AI 입점 매칭 데모 · © 2026
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
