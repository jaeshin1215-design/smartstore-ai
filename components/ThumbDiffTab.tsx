"use client";

import { useState } from "react";
import PolicyFilter from "@/components/PolicyFilter";

interface CompetitorPattern { background: string; composition: string; text_usage: string; weakness: string; }
interface Differentiation { background_tip: string; composition_tip: string; color_palette: string[]; text_tip: string; }
interface ClickHook { element: string; how: string; effect: string; }
interface AbTest { version_a: string; version_b: string; recommendation: string; }
interface ThumbResult {
  competitor_pattern: CompetitorPattern;
  differentiation: Differentiation;
  click_hooks: ClickHook[];
  ab_test: AbTest;
  mobile_tips: string[];
  ctr_checklist: string[];
}

const CATEGORIES = [
  "식품 > 건강식품", "식품 > 간식/음료", "의류 > 여성패션", "의류 > 남성패션",
  "뷰티 > 스킨케어", "생활 > 주방용품", "생활 > 인테리어", "디지털 > 이어폰",
  "스포츠 > 운동용품", "유아 > 완구/교육", "가전 > 생활가전", "문구 > 학용품"
];

export default function ThumbDiffTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [currentStyle, setCurrentStyle] = useState("");
  const [result, setResult] = useState<ThumbResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productName || !category) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/thumbdiff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, currentStyle }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🎨 썸네일 차별화 분석기</h2>
      <p className="text-gray-400 text-sm mb-6">경쟁사와 다른 썸네일로 클릭률을 높이는 차별화 전략을 만들어드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명 <span className="text-red-400">*</span></label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 무타공 욕실 온풍기"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리 <span className="text-red-400">*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors bg-white">
            <option value="">카테고리 선택</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="기타">기타 직접 입력</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>현재 내 썸네일 스타일 (선택)</label>
          <input type="text" value={currentStyle} onChange={(e) => setCurrentStyle(e.target.value)}
            placeholder="예) 흰색 배경 + 상품 정면 사진 + 가격 텍스트"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-blue-600">💡 <strong>핵심 원리:</strong> 모두가 흰 배경 쓸 때 컬러 배경으로, 모두가 텍스트 많이 쓸 때 깔끔하게 — 눈에 띄는 게 클릭률을 만들어요</p>
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName || !category}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              경쟁사 패턴 분석 중...
            </span>
          ) : "🎨 썸네일 차별화 전략 만들기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* 경쟁사 패턴 */}
          {result.competitor_pattern && (
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🔍 경쟁사 썸네일 패턴 (이렇게 하면 묻혀요)</p>
              <div className="space-y-2">
                {[
                  { label: "배경", value: result.competitor_pattern.background },
                  { label: "구도", value: result.competitor_pattern.composition },
                  { label: "텍스트", value: result.competitor_pattern.text_usage },
                  { label: "약점", value: result.competitor_pattern.weakness },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs font-bold text-gray-500 w-12 flex-shrink-0">{item.label}</span>
                    <span className="text-xs text-gray-600">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 차별화 전략 */}
          {result.differentiation && (
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea15, #764ba215)", border: "1px solid #667eea40" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>✨ 차별화 전략 (이렇게 하면 튀어요)</p>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-indigo-600 mb-1">배경 전략</p>
                  <p className="text-xs text-gray-600">{result.differentiation.background_tip}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-indigo-600 mb-1">구도 전략</p>
                  <p className="text-xs text-gray-600">{result.differentiation.composition_tip}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-indigo-600 mb-2">추천 컬러 팔레트</p>
                  <div className="flex gap-2">
                    {result.differentiation.color_palette?.map((color, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-gray-100 font-semibold" style={{ color: "#1a1a2e" }}>{color}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-indigo-600 mb-1">텍스트 전략</p>
                  <p className="text-xs text-gray-600">{result.differentiation.text_tip}</p>
                </div>
              </div>
            </div>
          )}

          {/* 클릭률 높이는 요소 */}
          {result.click_hooks?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🎯 클릭률 높이는 핵심 요소</p>
              <div className="space-y-2">
                {result.click_hooks.map((hook, i) => (
                  <div key={i} className="bg-yellow-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: "#f39c12" }}>{i + 1}</span>
                      <p className="font-bold text-sm text-yellow-800">{hook.element}</p>
                    </div>
                    <p className="text-xs text-yellow-700 mb-1 ml-7">방법: {hook.how}</p>
                    <p className="text-xs text-green-600 ml-7">효과: {hook.effect}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A/B 테스트 */}
          {result.ab_test && (
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm font-bold text-purple-700 mb-3">🧪 A/B 테스트 전략</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-gray-500 mb-1">A안 (안전)</p>
                  <p className="text-xs text-gray-600">{result.ab_test.version_a}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-bold text-purple-500 mb-1">B안 (도전)</p>
                  <p className="text-xs text-gray-600">{result.ab_test.version_b}</p>
                </div>
              </div>
              <p className="text-xs text-purple-600"><strong>추천:</strong> {result.ab_test.recommendation}</p>
            </div>
          )}

          {/* 모바일 팁 */}
          {result.mobile_tips?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-bold text-green-700 mb-2">📱 모바일 최적화 팁</p>
              {result.mobile_tips.map((tip, i) => (
                <div key={i} className="flex gap-2"><span className="text-green-400 text-xs mt-0.5">•</span><p className="text-xs text-green-600">{tip}</p></div>
              ))}
            </div>
          )}

          {/* CTR 체크리스트 */}
          {result.ctr_checklist?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>✅ 업로드 전 CTR 체크리스트</p>
              <div className="space-y-1">
                {result.ctr_checklist.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0"></span>
                    <p className="text-xs text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PolicyFilter text={[result.differentiation?.text_tip, ...(result.click_hooks?.map(h => h.how) ?? [])].filter(Boolean).join(" ")} />
        </div>
      )}
    </div>
  );
}
