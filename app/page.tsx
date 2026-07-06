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
  const [onboardingProgress, setOnboardingProgress] = useState(1);
  const [seoKeyword, setSeoKeyword] = useState("");

  useEffect(() => {
    const isRegistered = localStorage.getItem("product_registered") === "true";
    setOnboardingProgress(isRegistered ? 1 : 0);
  }, []);

  const handleSeoNavigate = (_keyword?: string) => {
    setActiveTab("discover");
  };

  return (
    <div
      className="min-h-screen pb-14"
      style={{ background: "#f9f9fb" }}
    >
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

            {/* Right: 26px height, 140px search, 8px gap */}
            <div className="flex items-center flex-shrink-0" style={{ gap: "8px" }}>
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search tools..."
                  style={{
                    height: "26px", width: "140px",
                    padding: "0 8px",
                    fontSize: "12px", color: "#6b7280",
                    border: "1px solid #e8eaed", borderRadius: "4px",
                    background: "white", outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <button
                onClick={() => setTrialOpen(true)}
                className="cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  height: "26px", padding: "0 12px",
                  fontSize: "12px", fontWeight: 600,
                  background: "#ef567c", color: "#fff", borderRadius: "5px",
                  border: "none", whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                Start free trial
              </button>
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
              {onboardingProgress === 0 ? (
                <div className="max-w-lg mx-auto text-center py-16 px-8 bg-white rounded border border-[#dededi] shadow-md select-none font-['Pretendard']" style={{ borderRadius: 5 }}>
                  <span className="text-4xl mb-4 block animate-bounce">💡</span>
                  <h2 className="text-xl font-bold text-[#0d0d0e] mb-3">상품 등록부터 시작하세요</h2>
                  <p className="text-sm text-[#64676b] leading-relaxed mb-8 max-w-sm mx-auto">
                    키워드 입찰 최적화 분석을 시작하려면 스토어 설정에서 최소 1개 이상의 자사 상품을 등록해야 합니다.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={() => setActiveTab("setup")}
                      className="w-full sm:w-auto px-6 py-3.5 bg-[#ef567c] text-white text-xs font-bold rounded hover:opacity-90 transition-opacity cursor-pointer text-center"
                      style={{ borderRadius: 5 }}
                    >
                      🧭 스토어 설정으로 가기 →
                    </button>
                    <button
                      onClick={async (e) => {
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        const originalText = btn.innerText;
                        btn.innerText = "⏳ 데모 데이터 적재 중...";
                        try {
                          await fetch("/api/db/init", { method: "POST" });
                          await fetch("/api/db/migrate", { method: "POST" });
                          await fetch("/api/db/seed", { method: "POST" });

                          localStorage.setItem("product_registered", "true");
                          localStorage.setItem("competitor_registered", "true");
                          localStorage.setItem("first_analysis_done", "true");

                          const DEMO_STORE_ID = "demo-store-001";
                          const DEMO_STORE_INFO = JSON.stringify({
                            id: DEMO_STORE_ID,
                            name: "데모 윈디 스토어",
                            email: "demo@sellfit.kr",
                            kakao: "01000000000",
                          });
                          localStorage.setItem("sellfit_store_id", DEMO_STORE_ID);
                          localStorage.setItem("sellfit_store_info", DEMO_STORE_INFO);

                          window.location.reload();
                        } catch (err) {
                          console.error("데모 적재 실패:", err);
                          btn.disabled = false;
                          btn.innerText = "❌ 실패 (재시도)";
                          setTimeout(() => { btn.innerText = originalText; }, 3000);
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 bg-white text-[#ef567c] border border-[#ef567c] text-xs font-bold rounded hover:bg-[#fff5f5] transition-colors cursor-pointer text-center"
                      style={{ borderRadius: 5 }}
                    >
                      ✨ 데모 데이터로 즉시 확인
                    </button>
                  </div>
                </div>
              ) : (
                <BiddingTab />
              )}
            </div>
          </div>
        )}

        {activeTab === "inbox"     && <CustomerTab />}
        {activeTab === "content"   && <ContentTab initialKeyword={seoKeyword} />}
        {activeTab === "setup"     && <StoreSetupTab onNavigate={setActiveTab} />}
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
