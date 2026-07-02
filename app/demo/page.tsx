"use client";

import { useState } from "react";
import TrendTab from "@/components/TrendTab";
import ReplyTab from "@/components/ReplyTab";
import ContentTab from "@/components/ContentTab";

const TABS = [
  {
    id: "trend",
    label: "Trend",
    icon: "📈",
    staff: "이다슬 (영업)",
    desc: "검색 트렌드 분석 · 경쟁 상품 비교",
  },
  {
    id: "reply",
    label: "Reply",
    icon: "💬",
    staff: "심유나 (CS)",
    desc: "고객 문의 자동 답변 생성",
  },
  {
    id: "content",
    label: "Content",
    icon: "✍️",
    staff: "강희원 (디자인)",
    desc: "마케팅 콘텐츠 전체 자동 생성",
  },
];

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState("trend");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9f9fb",
        fontFamily: "'Pretendard', -apple-system, sans-serif",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e8eaed",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "5px",
                background: "#ef567c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
              }}
            >
              🛍
            </div>
            <span
              style={{ fontSize: "16px", fontWeight: 700, color: "#0d0d0e" }}
            >
              SellFit
            </span>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>×</span>
            <span
              style={{ fontSize: "14px", fontWeight: 600, color: "#4a4f57" }}
            >
              이지스토리 데모
            </span>
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "9px",
              background: "#fff5f5",
              color: "#ef567c",
              letterSpacing: "0.04em",
            }}
          >
            LIVE DEMO
          </div>
        </div>
      </div>

      {/* 탭 바 */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e8eaed",
          padding: "0 32px",
          display: "flex",
          gap: "0",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "2px",
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #ef567c" : "2px solid transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px" }}>{tab.icon}</span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#ef567c" : "#4a4f57",
                  }}
                >
                  {tab.label}
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                {tab.staff}
              </span>
            </button>
          );
        })}
      </div>

      {/* 직원 서사 배너 */}
      <div
        style={{
          background: "#fafafa",
          borderBottom: "1px solid #e8eaed",
          padding: "10px 32px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "9px",
            background: "#fff5f5",
            color: "#ef567c",
          }}
        >
          {current.staff}
        </span>
        <span style={{ fontSize: "12px", color: "#64676b" }}>
          {current.desc}
        </span>
      </div>

      {/* 탭 콘텐츠 */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "32px 24px",
        }}
      >
        {activeTab === "trend" && <TrendTab />}
        {activeTab === "reply" && <ReplyTab />}
        {activeTab === "content" && <ContentTab />}
      </div>
    </div>
  );
}
