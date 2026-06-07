"use client";

import { useState, useEffect } from "react";
import DiagnosisTab from "@/components/DiagnosisTab";
import SetupTab     from "@/components/mezzanine/SetupTab";
import InboxTab     from "@/components/mezzanine/InboxTab";
import DiscoverTab  from "@/components/mezzanine/DiscoverTab";
import OptimizeTab  from "@/components/mezzanine/OptimizeTab";

const MEZZANINE_STORE_ID = "mezzanine-demo-001";
const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const TABS = [
  { id: "discover",  label: "Discover",  icon: "compass" },
  { id: "optimize",  label: "Optimize",  icon: "adjustments" },
  { id: "inbox",     label: "Inbox",     icon: "inbox" },
  { id: "diagnose",  label: "Diagnose",  icon: "layout-grid" },
  { id: "setup",     label: "Setup",     icon: "settings" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function MezzaninePage() {
  const [activeTab, setActiveTab] = useState<TabId>("discover");
  const [ready, setReady] = useState(false);

  const isFullHeight = activeTab === "discover" || activeTab === "diagnose";

  useEffect(() => {
    async function init() {
      try {
        await fetch("/api/db/init",          { method: "POST" });
        await fetch("/api/db/migrate",        { method: "POST" });
        await fetch("/api/db/seed-mezzanine", { method: "POST" });
      } catch { /* ignore */ }
      localStorage.setItem("mezzanine_store_id", MEZZANINE_STORE_ID);
      setReady(true);
    }
    init();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9fb", fontFamily: FF }}>

      {/* ── 헤더 (SellFit 1:1 구조) ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#fff",
        borderBottom: "1px solid #e8eaed",
        height: "44px",
        display: "flex",
        alignItems: "center",
      }}>
        {/* 로고 */}
        <div style={{
          padding: "0 16px",
          display: "flex", alignItems: "center", gap: "6px",
          borderRight: "1px solid #e8eaed",
          height: "44px",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            MEZZANINE
          </span>
          <span style={{ fontSize: "11px", color: "#9ca3af" }}>북가좌</span>
        </div>

        {/* 탭 */}
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: "44px",
                padding: "0 14px",
                display: "flex", alignItems: "center", gap: "6px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontFamily: FF,
                borderBottom: isActive ? "2px solid #3b4fd8" : "2px solid transparent",
                flexShrink: 0,
              }}
            >
              <i
                className={`ti ti-${tab.icon}`}
                style={{ fontSize: "14px", color: isActive ? "#3b4fd8" : "#6b7280" }}
              />
              <span style={{
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#3b4fd8" : "#6b7280",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* 우측 배지 */}
        <div style={{ marginLeft: "auto", padding: "0 16px", flexShrink: 0 }}>
          <span style={{
            fontSize: "11px", fontWeight: 600,
            padding: "2px 10px", borderRadius: "9px",
            background: "#f0f4ff", color: "#3b4fd8",
            letterSpacing: "0.04em",
          }}>
            INTERNAL DEMO · 2026.06
          </span>
        </div>
      </header>

      {/* ── 메인 ── */}
      <main style={isFullHeight
        ? { height: "calc(100vh - 44px)", overflow: "hidden" }
        : { padding: "20px 20px 80px", minHeight: "calc(100vh - 44px)" }
      }>
        {!ready ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            color: "#8f9399", fontSize: "13px", fontFamily: FF,
          }}>
            데모 데이터 초기화 중...
          </div>
        ) : (
          <>
            {activeTab === "discover"  && <DiscoverTab />}
            {activeTab === "optimize"  && <OptimizeTab />}
            {activeTab === "inbox"     && <InboxTab />}
            {activeTab === "diagnose"  && <DiagnosisTab mode="mezzanine" />}
            {activeTab === "setup"     && <SetupTab />}
          </>
        )}
      </main>

      {/* ── 푸터 ── */}
      <footer style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: "10px 24px",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderTop: "1px solid #e8eaed",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#3b4fd8", display: "inline-block",
          animation: "pulse 2s infinite",
        }} />
        <span style={{ fontSize: "11px", color: "#8f9399", fontFamily: FF }}>
          발굴 로직 + 현장 판단으로 배치한 예시 · 실제 입점 계약 아님 · Aiges Pontos 내부 데모
        </span>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </footer>
    </div>
  );
}
