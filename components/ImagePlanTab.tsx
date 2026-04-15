"use client";

import { useState } from "react";

interface ImageItem {
  index: number;
  type: string;
  description: string;
  angle: string;
  background: string;
  props: string;
  text_overlay: string;
  why_better: string;
}

interface Section {
  order: number;
  name: string;
  purpose: string;
  images: ImageItem[];
}

interface FreeTool {
  tool: string;
  purpose: string;
  url_hint: string;
}

interface ImagePlanResult {
  strategy: string;
  competitor_weakness: string;
  sections: Section[];
  total_images: number;
  shooting_tips: string[];
  mobile_optimization: string[];
  free_tools: FreeTool[];
}

const CATEGORIES = [
  "식품 > 건강식품", "식품 > 간식/음료", "식품 > 신선식품",
  "의류 > 여성패션", "의류 > 남성패션", "의류 > 아동복",
  "뷰티 > 스킨케어", "뷰티 > 헤어케어", "뷰티 > 메이크업",
  "생활 > 주방용품", "생활 > 인테리어", "생활 > 청소/세탁",
  "디지털 > 이어폰/헤드폰", "디지털 > 스마트기기",
  "스포츠 > 운동용품", "스포츠 > 아웃도어",
  "유아 > 완구/교육", "반려동물 > 사료/간식", "반려동물 > 용품"
];

const SECTION_COLORS: Record<number, { bg: string; border: string; badge: string; text: string }> = {
  1: { bg: "#fff7ed", border: "#fed7aa", badge: "#ea580c", text: "#9a3412" },
  2: { bg: "#fef2f2", border: "#fecaca", badge: "#dc2626", text: "#991b1b" },
  3: { bg: "#eff6ff", border: "#bfdbfe", badge: "#2563eb", text: "#1e40af" },
  4: { bg: "#f0fdf4", border: "#bbf7d0", badge: "#16a34a", text: "#166534" },
  5: { bg: "#faf5ff", border: "#e9d5ff", badge: "#7c3aed", text: "#5b21b6" },
  6: { bg: "#ecfeff", border: "#a5f3fc", badge: "#0891b2", text: "#164e63" },
  7: { bg: "#fffbeb", border: "#fde68a", badge: "#d97706", text: "#92400e" },
  8: { bg: "#f0fdf4", border: "#86efac", badge: "#15803d", text: "#14532d" },
};

export default function ImagePlanTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [price, setPrice] = useState("");
  const [uniquePoint, setUniquePoint] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [result, setResult] = useState<ImagePlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState<number[]>([1]);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/imageplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, features, targetCustomer, price, uniquePoint, competitorUrl }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setOpenSections([1]);
      }
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (order: number) => {
    setOpenSections(prev =>
      prev.includes(order) ? prev.filter(n => n !== order) : [...prev, order]
    );
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>📸 상세페이지 이미지 기획</h2>
      <p className="text-gray-400 text-sm mb-6">경쟁사보다 나은 상세페이지 이미지 구성을 AI가 섹션별로 기획해드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
            상품명 <span className="text-red-400">*</span>
          </label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 국산 유기농 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 bg-white">
            <option value="">카테고리 선택</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>주요 특징</label>
          <textarea value={features} onChange={(e) => setFeatures(e.target.value)}
            placeholder="예) 국산 100%, 유기농 인증, 무농약, 분말 타입 흡수 빠름, 안토시아닌 풍부"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>타겟 고객</label>
            <input type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
              placeholder="예) 40~60대 건강 관심 여성"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>판매가</label>
            <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="예) 29,900원"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>경쟁사 대비 차별점</label>
          <input type="text" value={uniquePoint} onChange={(e) => setUniquePoint(e.target.value)}
            placeholder="예) 농촌진흥청 인증, 산지직송, 소분 포장 없음"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>
            참고할 경쟁사 URL
            <span className="text-gray-400 font-normal text-xs ml-2">(쿠팡/스마트스토어 상세페이지 주소 - 선택)</span>
          </label>
          <input type="text" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="경쟁사 상품 URL을 붙여넣으면 더 정교한 차별화 전략을 제안해드려요"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
          <p className="text-xs text-amber-500 mt-1">⚠️ 외부 사이트는 직접 접속이 차단될 수 있어 URL은 전략 힌트로만 활용됩니다</p>
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              이미지 기획안 생성 중...
            </span>
          ) : "📸 상세페이지 이미지 기획안 생성"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">

          {/* 전략 요약 */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <p className="text-xs text-white/70 mb-1">AI 이미지 전략</p>
            <p className="text-sm font-bold text-white">{result.strategy}</p>
            {result.total_images && (
              <p className="text-xs text-white/80 mt-2">총 {result.total_images}장 구성 제안</p>
            )}
          </div>

          {/* 경쟁사 약점 */}
          {result.competitor_weakness && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-600 mb-1">⚠️ 경쟁사의 흔한 약점</p>
              <p className="text-xs text-red-500">{result.competitor_weakness}</p>
            </div>
          )}

          {/* 섹션별 이미지 기획 */}
          {result.sections?.map((section) => {
            const colors = SECTION_COLORS[section.order] || SECTION_COLORS[1];
            const isOpen = openSections.includes(section.order);
            return (
              <div key={section.order} className="border rounded-xl overflow-hidden" style={{ borderColor: colors.border }}>
                {/* 섹션 헤더 */}
                <button
                  onClick={() => toggleSection(section.order)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer text-left"
                  style={{ background: colors.bg }}>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: colors.badge }}>
                      {section.order}
                    </span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: colors.text }}>{section.name}</p>
                      <p className="text-xs text-gray-500">{section.purpose}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                      style={{ background: colors.badge }}>
                      {section.images?.length || 0}장
                    </span>
                    <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* 이미지 목록 */}
                {isOpen && (
                  <div className="divide-y divide-gray-100">
                    {section.images?.map((img) => (
                      <div key={img.index} className="p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: colors.bg, color: colors.badge }}>
                              #{img.index} {img.type}
                            </span>
                          </div>
                          <button onClick={() => copyText(`[${img.type}]\n${img.description}\n각도: ${img.angle}\n배경: ${img.background}\n소품: ${img.props}`)}
                            className="text-xs text-gray-400 hover:text-indigo-500 cursor-pointer">복사</button>
                        </div>

                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{img.description}</p>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-400 mb-0.5">촬영 각도</p>
                            <p className="text-xs font-semibold text-gray-700">{img.angle}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-400 mb-0.5">배경</p>
                            <p className="text-xs font-semibold text-gray-700">{img.background}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-400 mb-0.5">소품</p>
                            <p className="text-xs font-semibold text-gray-700">{img.props || "없음"}</p>
                          </div>
                        </div>

                        {img.text_overlay && (
                          <div className="bg-indigo-50 rounded-lg px-3 py-2 mb-2">
                            <p className="text-xs text-indigo-400 mb-0.5">텍스트 오버레이</p>
                            <p className="text-xs font-bold text-indigo-700">"{img.text_overlay}"</p>
                          </div>
                        )}

                        {img.why_better && (
                          <div className="flex gap-1.5 items-start">
                            <span className="text-green-500 text-xs flex-shrink-0">✓</span>
                            <p className="text-xs text-green-600">{img.why_better}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 촬영 팁 */}
          {result.shooting_tips?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-700 mb-3">📷 실전 촬영 팁</p>
              <div className="space-y-2">
                {result.shooting_tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <p className="text-xs text-amber-700">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 모바일 최적화 */}
          {result.mobile_optimization?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-700 mb-3">📱 모바일 최적화 팁</p>
              <div className="space-y-2">
                {result.mobile_optimization.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <p className="text-xs text-blue-700">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 무료 도구 추천 */}
          {result.free_tools?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>🛠️ 무료로 쓸 수 있는 이미지 도구</p>
              <div className="space-y-2">
                {result.free_tools.map((tool, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-700">{tool.tool}</p>
                      <p className="text-xs text-gray-500">{tool.purpose}</p>
                    </div>
                    <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{tool.url_hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 전체 복사 */}
          <button
            onClick={() => {
              const text = result.sections?.map(s =>
                `=== ${s.order}. ${s.name} ===\n목적: ${s.purpose}\n\n` +
                s.images?.map(img =>
                  `[이미지 #${img.index} - ${img.type}]\n${img.description}\n각도: ${img.angle} | 배경: ${img.background} | 소품: ${img.props}\n${img.text_overlay ? `텍스트: "${img.text_overlay}"\n` : ""}✓ ${img.why_better}`
                ).join("\n\n")
              ).join("\n\n");
              copyText(text || "");
            }}
            className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
            📋 전체 기획안 복사
          </button>
        </div>
      )}
    </div>
  );
}
