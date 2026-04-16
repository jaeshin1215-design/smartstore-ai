"use client";

import { useState } from "react";
import ContentTab from "@/components/ContentTab";
import TrendTab from "@/components/TrendTab";
import SeoTab from "@/components/SeoTab";
import StoryTab from "@/components/StoryTab";
import ThumbDiffTab from "@/components/ThumbDiffTab";
import UpsellTab from "@/components/UpsellTab";
import AdCopyTab from "@/components/AdCopyTab";
import BiddingTab from "@/components/BiddingTab";
import DiscountTab from "@/components/DiscountTab";
import CustomerTab from "@/components/CustomerTab";
import TagsTab from "@/components/TagsTab";
import ImageEditTab from "@/components/ImageEditTab";
import PricingTab from "@/components/PricingTab";
import FeedbackButton from "@/components/FeedbackButton";

const TABS = [
  { id: "content",  label: "🚀 All in One" },
  { id: "trend",    label: "📊 트렌드 리포트" },
  { id: "seo",      label: "📈 상품명 SEO" },
  { id: "story",    label: "🛒 구매 전환율" },
  { id: "thumbdiff",label: "🎨 썸네일 차별화" },
  { id: "upsell",   label: "📦 업셀링 전략" },
  { id: "adcopy",   label: "📣 광고 전략" },
  { id: "bidding",  label: "💡 키워드 입찰" },
  { id: "discount", label: "🎁 할인 & 가치" },
  { id: "customer", label: "💬 고객 소통" },
  { id: "tags",     label: "🏷️ 태그 생성" },
  { id: "imageedit",label: "✏️ 이미지 편집" },
  { id: "pricing",  label: "💰 가격 책정" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("content");

  return (
    <div className="min-h-screen" style={{ background: "#f0f4ff" }}>
      <header style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }} className="text-white py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">🛍️ 스마트스토어 AI 도우미</h1>
          <p className="opacity-80 text-sm md:text-base">
            AI로 상품 설명, 키워드, 고객 답변을 자동으로 만들어보세요
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="whitespace-nowrap px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer"
              style={
                activeTab === tab.id
                  ? { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }
                  : { background: "white", color: "#6b7280" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {activeTab === "content"   && <ContentTab />}
          {activeTab === "trend"     && <TrendTab />}
          {activeTab === "seo"       && <SeoTab />}
          {activeTab === "story"     && <StoryTab />}
          {activeTab === "thumbdiff" && <ThumbDiffTab />}
          {activeTab === "upsell"    && <UpsellTab />}
          {activeTab === "adcopy"    && <AdCopyTab />}
          {activeTab === "bidding"   && <BiddingTab />}
          {activeTab === "discount"  && <DiscountTab />}
          {activeTab === "customer"  && <CustomerTab />}
          {activeTab === "tags"      && <TagsTab />}
          {activeTab === "imageedit" && <ImageEditTab />}
          {activeTab === "pricing"   && <PricingTab />}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Powered by Claude AI · 스마트스토어 셀러를 위한 AI 도우미
        </p>
      </div>
      <FeedbackButton />
    </div>
  );
}
