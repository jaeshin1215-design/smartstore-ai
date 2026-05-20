"use client";

import { useState, useEffect } from "react";
import SeoTab from "@/components/SeoTab";
import BiddingTab from "@/components/BiddingTab";
import CustomerTab from "@/components/CustomerTab";
import PricingTab from "@/components/PricingTab";
import TrendTab, { preloadHotKeywords } from "@/components/TrendTab";
import VoiceTab from "@/components/VoiceTab";
import CompareTab from "@/components/CompareTab";
import StoreSetupTab from "@/components/StoreSetupTab";
import DiagnosisTab from "@/components/DiagnosisTab";
import FeedbackButton from "@/components/FeedbackButton";
import TrialModal from "@/components/TrialModal";

const TABS = [
  { id: "trend",    emoji: "📊", label: "트렌드", comingSoon: false },
  { id: "seo",      emoji: "🔍", label: "SEO",    comingSoon: false },
  { id: "bidding",  emoji: "💡", label: "광고",   comingSoon: false },
  { id: "customer", emoji: "💬", label: "고객",   comingSoon: false },
  { id: "pricing",  emoji: "💰", label: "가격",   comingSoon: false },
  { id: "compare",  emoji: "⚡", label: "비교",   comingSoon: false },
  { id: "setup",    emoji: "📌", label: "설정",   comingSoon: false },
  { id: "diagnosis",emoji: "🩺", label: "진단",   comingSoon: false },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("trend");
  const [seoKeyword, setSeoKeyword] = useState("");
  const [trialOpen, setTrialOpen] = useState(false);

  useEffect(() => { preloadHotKeywords(); }, []);

  const handleSeoNavigate = (keyword: string) => {
    setSeoKeyword(keyword);
    setActiveTab("seo");
  };

  return (
    <div
      className="min-h-screen pb-14"
      style={{ background: "linear-gradient(135deg, #e8f5f0 0%, #eef0f8 50%, #e8f5f0 100%)" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid #e0ede9",
        }}
      >
        <div className="max-w-5xl mx-auto px-4">
          {/* Logo row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛍️</span>
              <span className="font-bold text-base" style={{ color: "#0f2a1e" }}>
                SellFit
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#e8f5f0", color: "#00aa6c" }}
              >
                BETA
              </span>
            </div>
            <button
              onClick={() => setTrialOpen(true)}
              className="text-xs font-bold px-4 py-2 text-white cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: "#0f2a1e", borderRadius: 20 }}
            >
              7일 무료 체험
            </button>
          </div>

          {/* Tab navigation */}
          <div className="grid grid-cols-8" style={{ borderTop: "1px solid #e0ede9" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
                className="relative flex flex-col items-center py-3 transition-all border-b-2"
                style={
                  tab.comingSoon
                    ? { borderColor: "transparent", color: "#9ca3af", cursor: "default" }
                    : activeTab === tab.id
                    ? { borderColor: "#00aa6c", color: "#0f2a1e", cursor: "pointer" }
                    : { borderColor: "transparent", color: "#9ca3af", cursor: "pointer" }
                }
              >
                <span className="text-base leading-none mb-0.5">{tab.emoji}</span>
                <span className="flex items-center gap-1 leading-tight">
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                  {tab.comingSoon && (
                    <span
                      className="font-bold rounded-full whitespace-nowrap"
                      style={{ background: "#e8f5f0", color: "#00aa6c", fontSize: "7px", lineHeight: 1.2, padding: "1px 4px" }}
                    >
                      Coming Soon
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "trend"    && <TrendTab onSeoNavigate={handleSeoNavigate} />}
        {activeTab === "seo"      && <SeoTab initialKeyword={seoKeyword} />}
        {activeTab === "bidding"  && <BiddingTab />}
        {activeTab === "customer" && <CustomerTab />}
        {activeTab === "pricing"  && <PricingTab />}
        {activeTab === "voice"    && <VoiceTab />}
        {activeTab === "compare"  && <CompareTab />}
        {activeTab === "setup"    && <StoreSetupTab />}
        {activeTab === "diagnosis"&& <DiagnosisTab onSeoNavigate={handleSeoNavigate} />}
      </main>

      {/* ── Bottom notice bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-10"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1px solid #e0ede9",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#00aa6c" }}
          />
          <span className="text-xs" style={{ color: "#6b7280" }}>
            실시간 네이버 데이터 기반 · AI 매출 파트너
          </span>
        </div>
      </div>

      <FeedbackButton />
      <TrialModal open={trialOpen} onClose={() => setTrialOpen(false)} />
    </div>
  );
}
