"use client";

import { useState, useEffect } from "react";
import BiddingTab from "@/components/BiddingTab";
import CustomerTab from "@/components/CustomerTab";
import PricingTab from "@/components/PricingTab";
import DiscoverTab from "@/components/DiscoverTab";
import StoreSetupTab from "@/components/StoreSetupTab";
import DiagnosisTab from "@/components/DiagnosisTab";
import FeedbackButton from "@/components/FeedbackButton";
import TrialModal from "@/components/TrialModal";
import SellFitFooter from "@/components/SellFitFooter";
import CalendarTab from "@/components/CalendarTab";
import ProfitSimulatorTab from "@/components/ProfitSimulatorTab";
import ContentTab from "@/components/ContentTab";
import ImpersonationBar from "@/components/ImpersonationBar";

const TABS = [
  { id: "setup",     icon: "ti ti-settings",       label: "Setup"     },
  { id: "discover",  icon: "ti ti-compass",        label: "Discover"  },
  { id: "diagnosis", icon: "ti ti-layout-grid",    label: "Diagnose"  },
  { id: "optimize",  icon: "ti ti-adjustments",    label: "Optimize"  },
  { id: "content",   icon: "ti ti-file-text",       label: "Content"   },
  { id: "calendar",  icon: "ti ti-calendar-month", label: "Calendar"  },
  { id: "inbox",     icon: "ti ti-inbox",           label: "Inbox"     },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("setup");
  const [trialOpen, setTrialOpen] = useState(false);
  const [seoKeyword, setSeoKeyword] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [showFullAccount, setShowFullAccount] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => setAccount(d.user?.email ?? null))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  const handleSeoNavigate = (_keyword?: string) => {
    setActiveTab("discover");
  };

  return (
    <div
      className="min-h-screen pb-14"
      style={{ background: "#f9f9fb" }}
    >
      {/* 운영자 임퍼소네이션 바 — operator 아니면 렌더 없음 */}
      <ImpersonationBar />
      <header
        className="sticky top-0 z-20"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid #e8eaed",
        }}
      >
        <div style={{ padding: "0 24px" }}>
          {/* Single row — height 36px (Frill 기준) */}
          <div className="flex items-stretch" style={{ height: "44px" }}>

            {/* Logo */}
            <div className="flex items-center flex-shrink-0" style={{ gap: "6px", marginRight: "16px" }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "4px",
                background: "#ef567c",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: "10px" }}>🛍</span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#0d0d0e", letterSpacing: "-0.01em" }}>
                SellFit
              </span>
              <span style={{
                fontSize: "9px", fontWeight: 700, padding: "0 6px", lineHeight: "16px",
                borderRadius: "9px", background: "#fff5f5", color: "#ef567c",
                letterSpacing: "0.04em",
              }}>
                BETA
              </span>
            </div>

            {/* Tabs */}
            <nav className="flex items-stretch flex-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center cursor-pointer transition-colors"
                    style={{
                      gap: "5px",
                      padding: "0 12px",
                      fontSize: "15px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#ef567c" : "#4a4f57",
                      background: "none",
                      border: "none",
                      borderBottom: isActive ? "2px solid #ef567c" : "2px solid transparent",
                      whiteSpace: "nowrap",
                      fontFamily: "inherit",
                    }}
                  >
                    <i
                      className={tab.icon}
                      style={{
                        fontSize: "18px",
                        color: isActive ? "#ef567c" : "#4a4f57",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right — 좌측 탭과 동급 선명도(15px/500/#4a4f57)로 통일. 장식용 검색창 제거 */}
            <div className="flex items-center flex-shrink-0" style={{ gap: "14px" }}>
              {account ? (
                <>
                  {/* 계정: @ 앞부분만, hover(title)·클릭 시 전체 이메일 */}
                  <span
                    onClick={() => setShowFullAccount(v => !v)}
                    title={account}
                    style={{
                      fontSize: "15px", fontWeight: 500, color: "#4a4f57",
                      whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {showFullAccount ? account : account.split("@")[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      padding: "5px 14px",
                      fontSize: "15px", fontWeight: 500,
                      background: "#fff", color: "#ef567c", borderRadius: "6px",
                      border: "1px solid #ef567c", whiteSpace: "nowrap",
                      fontFamily: "inherit", lineHeight: 1.4,
                    }}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setTrialOpen(true)}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    padding: "5px 14px",
                    fontSize: "15px", fontWeight: 500,
                    background: "#ef567c", color: "#fff", borderRadius: "6px",
                    border: "none", whiteSpace: "nowrap",
                    fontFamily: "inherit", lineHeight: 1.4,
                  }}
                >
                  도입 문의
                </button>
              )}
            </div>

          </div>
        </div>
      </header>


      {/* ── Main content ── */}
      <main className="w-full px-6 py-6 pb-16">
        {activeTab === "discover" && (
          <DiscoverTab onNavigateToContent={(kw) => { setSeoKeyword(kw); setActiveTab("content"); }} />
        )}



        {activeTab === "optimize" && (
          <div style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
            <ProfitSimulatorTab />
            <div style={{ borderTop: "1px solid #dededi", paddingTop: "3.5rem", marginTop: "4rem", display: "flex", flexDirection: "column", gap: "32px" }}>
              <PricingTab />
              <BiddingTab />
            </div>
          </div>
        )}

        {activeTab === "inbox"     && <CustomerTab />}
        {activeTab === "content"   && <ContentTab initialKeyword={seoKeyword} />}
        {activeTab === "setup"     && <StoreSetupTab />}
        {activeTab === "diagnosis" && <DiagnosisTab onSeoNavigate={handleSeoNavigate} />}
        {activeTab === "calendar"  && <CalendarTab />}
      </main>

      <SellFitFooter />

      {/* ── Bottom notice bar ── */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-20 py-2.5 text-center select-none"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1px solid #dededi",
        }}
      >
        <div className="max-w-[1600px] mx-auto px-12 py-2 flex items-center justify-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#ef567c" }}
          />
          <span className="text-xs" style={{ color: "#8f9399" }}>
            실시간 네이버 데이터 기반 · AI 매출 파트너
          </span>
        </div>
      </footer>

      <FeedbackButton />
      <TrialModal open={trialOpen} onClose={() => setTrialOpen(false)} />
    </div>
  );
}
