"use client";

import { useState } from "react";
import DescriptionTab from "@/components/DescriptionTab";
import KeywordsTab from "@/components/KeywordsTab";
import ReplyTab from "@/components/ReplyTab";
import TagsTab from "@/components/TagsTab";
import ThumbnailTab from "@/components/ThumbnailTab";
import ReviewTab from "@/components/ReviewTab";
import PricingTab from "@/components/PricingTab";
import SeoTab from "@/components/SeoTab";
import AdCopyTab from "@/components/AdCopyTab";
import StoryTab from "@/components/StoryTab";
import BiddingTab from "@/components/BiddingTab";
import DiscountTab from "@/components/DiscountTab";
import ThumbDiffTab from "@/components/ThumbDiffTab";
import UpsellTab from "@/components/UpsellTab";

const TABS = [
  { id: "description", label: "📝 상품 설명문" },
  { id: "seo", label: "📈 상품명 SEO" },
  { id: "keywords", label: "🔍 세부 키워드" },
  { id: "story", label: "🛒 구매 전환율" },
  { id: "thumbdiff", label: "🎨 썸네일 차별화" },
  { id: "upsell", label: "📦 업셀링 전략" },
  { id: "adcopy", label: "📣 광고 전략" },
  { id: "bidding", label: "💡 키워드 입찰" },
  { id: "discount", label: "🎁 할인 & 가치" },
  { id: "reply", label: "💬 문의 답변" },
  { id: "tags", label: "🏷️ 태그 생성" },
  { id: "thumbnail", label: "🖼️ 썸네일 문구" },
  { id: "review", label: "⭐ 리뷰 답글" },
  { id: "pricing", label: "💰 가격 책정" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("description");

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
          {activeTab === "description" && <DescriptionTab />}
          {activeTab === "keywords" && <KeywordsTab />}
          {activeTab === "seo" && <SeoTab />}
          {activeTab === "story" && <StoryTab />}
          {activeTab === "thumbdiff" && <ThumbDiffTab />}
          {activeTab === "upsell" && <UpsellTab />}
          {activeTab === "adcopy" && <AdCopyTab />}
          {activeTab === "bidding" && <BiddingTab />}
          {activeTab === "discount" && <DiscountTab />}
          {activeTab === "reply" && <ReplyTab />}
          {activeTab === "tags" && <TagsTab />}
          {activeTab === "thumbnail" && <ThumbnailTab />}
          {activeTab === "review" && <ReviewTab />}
          {activeTab === "pricing" && <PricingTab />}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Powered by Claude AI · 스마트스토어 셀러를 위한 AI 도우미
        </p>
      </div>
    </div>
  );
}
