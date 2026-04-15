"use client";

import { useState } from "react";

interface MarketingCopy { type: string; copy: string; sub: string; }
interface ThumbnailSet { main: string; sub: string; badge: string; }
interface DetailFeature { title: string; desc: string; image_guide: string; }
interface DetailPage {
  hook: string; problem: string; solution: string;
  features: DetailFeature[]; trust: string; cta: string; urgency: string;
  faq: { q: string; a: string }[];
}
interface BlogPost { title: string; intro: string; body: string; outro: string; tags: string[]; }
interface Instagram { caption: string; hashtags: string[]; story_text: string; }
interface Kakao { channel_post: string; talk_message: string; }
interface CanvaGuide { thumbnail_style: string; color_scheme: string; font_suggestion: string; layout_tip: string; }
interface ContentResult {
  marketing_copies: MarketingCopy[];
  thumbnail_sets: ThumbnailSet[];
  detail_page: DetailPage;
  blog_post: BlogPost;
  instagram: Instagram;
  kakao: Kakao;
  canva_guide: CanvaGuide;
}

interface ImageItem {
  index: number; type: string; description: string;
  angle: string; background: string; props: string;
  text_overlay: string; why_better: string; ai_prompt?: string;
}
interface ImageSection {
  order: number; name: string; purpose: string; images: ImageItem[];
}
interface FreeTool { tool: string; purpose: string; url_hint: string; }
interface ImagePlanResult {
  strategy: string; competitor_weakness: string;
  sections: ImageSection[]; total_images: number;
  shooting_tips: string[]; mobile_optimization: string[];
  free_tools: FreeTool[];
}

const SECTION_COLORS: Record<number, { bg: string; border: string; badge: string; text: string }> = {
  1: { bg: "#fff7ed", border: "#fed7aa", badge: "#ea580c", text: "#9a3412" },
  2: { bg: "#fef2f2", border: "#fecaca", badge: "#dc2626", text: "#991b1b" },
  3: { bg: "#eff6ff", border: "#bfdbfe", badge: "#2563eb", text: "#1e40af" },
  4: { bg: "#f0fdf4", border: "#bbf7d0", badge: "#16a34a", text: "#166534" },
  5: { bg: "#faf5ff", border: "#e9d5ff", badge: "#7c3aed", text: "#5b21b6" },
  6: { bg: "#ecfeff", border: "#a5f3fc", badge: "#0891b2", text: "#164e63" },
  7: { bg: "#fffbeb", border: "#fde68a", badge: "#d97706", text: "#92400e" },
  8: { bg: "#f0fdf4", border: "#86efac", badge: "#15803d", text: "#14532d" },
  9: { bg: "#fdf4ff", border: "#e9d5ff", badge: "#9333ea", text: "#6b21a8" },
};

export default function ContentTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [price, setPrice] = useState("");
  const [uniquePoint, setUniquePoint] = useState("");
  const [result, setResult] = useState<ContentResult | null>(null);
  const [imagePlan, setImagePlan] = useState<ImagePlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("marketing");
  const [copied, setCopied] = useState<string | null>(null);
  const [openImageSections, setOpenImageSections] = useState<number[]>([1]);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    setImagePlan(null);
    try {
      const payload = { productName, category, features, targetCustomer, price, uniquePoint };
      const [contentRes, imageRes] = await Promise.all([
        fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
        fetch("/api/imageplan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
      ]);
      const [contentData, imageData] = await Promise.all([contentRes.json(), imageRes.json()]);
      if (contentData.result) { setResult(contentData.result); setActiveSection("marketing"); }
      if (imageData.result) { setImagePlan(imageData.result); setOpenImageSections([1]); }
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleImageSection = (order: number) => {
    setOpenImageSections(prev =>
      prev.includes(order) ? prev.filter(n => n !== order) : [...prev, order]
    );
  };

  const generateImage = (key: string, prompt: string) => {
    if (generatedImages[key] || loadingImages[key]) return;
    setLoadingImages(prev => ({ ...prev, [key]: true }));
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true&model=flux&seed=${Math.floor(Math.random() * 9999)}`;
    setGeneratedImages(prev => ({ ...prev, [key]: url }));
  };

  const downloadImage = async (url: string, filename: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className="text-xs px-2 py-1 rounded-lg font-semibold cursor-pointer flex-shrink-0"
      style={{ background: copied === id ? "#e8f9f0" : "#e8f0fe", color: copied === id ? "#2d9653" : "#4361ee" }}>
      {copied === id ? "✓" : "📋"}
    </button>
  );

  const sections = [
    { id: "marketing", label: "📣 카피" },
    { id: "thumbnail", label: "🖼️ 썸네일" },
    { id: "detail", label: "📄 상세페이지" },
    { id: "imageplan", label: "📸 이미지 기획" },
    { id: "blog", label: "📝 블로그" },
    { id: "instagram", label: "📱 인스타" },
    { id: "kakao", label: "💬 카카오" },
    { id: "canva", label: "🎨 Canva" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-xl font-bold" style={{ color: "#1a1a2e" }}>🚀 All in One 콘텐츠</h2>
        <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#e74c3c" }}>NEW</span>
      </div>
      <p className="text-gray-400 text-sm mb-6">상품 정보 한 번 입력 → 마케팅 카피·블로그·인스타·상세페이지·이미지 기획 한 번에 완성!</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명 <span className="text-red-400">*</span></label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 국산 유기농 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
              placeholder="예) 식품 > 건강식품"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>판매가</label>
            <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="예) 19,900원"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>주요 특징</label>
          <input type="text" value={features} onChange={(e) => setFeatures(e.target.value)}
            placeholder="예) 유기농 인증, 국산 원료, 당일 발송, 무농약"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>타겟 고객</label>
          <input type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
            placeholder="예) 건강 관리하는 30~50대 여성"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>경쟁사 대비 차별점</label>
          <input type="text" value={uniquePoint} onChange={(e) => setUniquePoint(e.target.value)}
            placeholder="예) 타사 대비 안토시아닌 함량 3배, 소분 포장"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName}
          className="w-full py-4 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              모든 콘텐츠 + 이미지 기획 생성 중... (약 15~20초)
            </span>
          ) : "🚀 모든 콘텐츠 한 번에 생성하기"}
        </button>
      </div>

      {(result || imagePlan) && (
        <div className="mt-6">
          {/* 섹션 탭 */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                style={activeSection === s.id
                  ? { background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }
                  : { background: "#f0f0ff", color: "#667eea" }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* 마케팅 카피 */}
          {activeSection === "marketing" && result?.marketing_copies && (
            <div className="space-y-3">
              <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>마케팅 카피 3종</p>
              {result.marketing_copies.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ background: i === 0 ? "#e74c3c" : i === 1 ? "#667eea" : "#2ecc71" }}>{c.type}</span>
                    <CopyBtn text={`${c.copy}\n${c.sub}`} id={`copy-${i}`} />
                  </div>
                  <p className="font-bold text-base mb-1" style={{ color: "#1a1a2e" }}>{c.copy}</p>
                  <p className="text-sm text-gray-500">{c.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* 썸네일 */}
          {activeSection === "thumbnail" && result?.thumbnail_sets && (
            <div className="space-y-3">
              <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>썸네일 문구 세트 3종</p>
              {result.thumbnail_sets.map((t, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400">세트 {i + 1}</span>
                    <CopyBtn text={`메인: ${t.main}\n서브: ${t.sub}\n뱃지: ${t.badge}`} id={`thumb-${i}`} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10">메인</span>
                      <span className="font-bold text-base" style={{ color: "#1a1a2e" }}>{t.main}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10">서브</span>
                      <span className="text-sm text-gray-600">{t.sub}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10">뱃지</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#fff0f0", color: "#e74c3c" }}>{t.badge}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 상세페이지 */}
          {activeSection === "detail" && result?.detail_page && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <CopyBtn text={`[후킹] ${result.detail_page.hook}\n\n[문제공감] ${result.detail_page.problem}\n\n[해결책] ${result.detail_page.solution}\n\n[신뢰] ${result.detail_page.trust}\n\n[긴급성] ${result.detail_page.urgency}\n\n[CTA] ${result.detail_page.cta}`} id="detail-all" />
              </div>
              {[
                { label: "⚡ 후킹 문구", value: result.detail_page.hook, bg: "linear-gradient(135deg, #667eea, #764ba2)", textColor: "white" },
                { label: "😓 문제 공감", value: result.detail_page.problem, bg: "#fee2e2", textColor: "#b91c1c" },
                { label: "✅ 해결책", value: result.detail_page.solution, bg: "#dbeafe", textColor: "#1d4ed8" },
                { label: "🏆 신뢰 증거", value: result.detail_page.trust, bg: "#d1fae5", textColor: "#065f46" },
                { label: "🔥 긴급성", value: result.detail_page.urgency, bg: "#ffedd5", textColor: "#c2410c" },
                { label: "🛒 구매 유도", value: result.detail_page.cta, bg: "linear-gradient(135deg, #f093fb, #f5576c)", textColor: "white" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: item.bg }}>
                  <p className="text-xs font-bold mb-1" style={{ color: item.textColor, opacity: 0.8 }}>{item.label}</p>
                  <p className="text-sm font-semibold" style={{ color: item.textColor }}>{item.value}</p>
                </div>
              ))}
              {result.detail_page.features?.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>📋 상세페이지 섹션</p>
                  {result.detail_page.features.map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 mb-2">
                      <p className="font-bold text-sm mb-1" style={{ color: "#1a1a2e" }}>{f.title}</p>
                      <p className="text-xs text-gray-600 mb-1">{f.desc}</p>
                      <p className="text-xs text-indigo-500">📷 {f.image_guide}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.detail_page.faq?.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>❓ FAQ</p>
                  {result.detail_page.faq.map((f, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                      <p className="text-sm font-bold mb-1" style={{ color: "#1a1a2e" }}>Q. {f.q}</p>
                      <p className="text-xs text-gray-600">A. {f.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📸 이미지 기획 */}
          {activeSection === "imageplan" && (
            <div className="space-y-3">
              {imagePlan ? (
                <>
                  {/* 전략 요약 */}
                  <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                    <p className="text-xs text-white/70 mb-1">📸 상세페이지 이미지 전략</p>
                    <p className="text-sm font-bold text-white">{imagePlan.strategy}</p>
                    {imagePlan.total_images && (
                      <p className="text-xs text-white/70 mt-1">총 {imagePlan.total_images}장 구성 제안</p>
                    )}
                  </div>

                  {/* 경쟁사 약점 */}
                  {imagePlan.competitor_weakness && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-red-500 mb-1">⚠️ 경쟁사의 흔한 약점</p>
                      <p className="text-xs text-red-400">{imagePlan.competitor_weakness}</p>
                    </div>
                  )}

                  {/* 섹션별 이미지 */}
                  {imagePlan.sections?.map((section) => {
                    const colors = SECTION_COLORS[section.order] || SECTION_COLORS[1];
                    const isOpen = openImageSections.includes(section.order);
                    return (
                      <div key={section.order} className="border rounded-xl overflow-hidden" style={{ borderColor: colors.border }}>
                        <button onClick={() => toggleImageSection(section.order)}
                          className="w-full flex items-center justify-between p-3 cursor-pointer text-left"
                          style={{ background: colors.bg }}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                              style={{ background: colors.badge }}>{section.order}</span>
                            <div>
                              <p className="text-sm font-bold" style={{ color: colors.text }}>{section.name}</p>
                              <p className="text-xs text-gray-400">{section.purpose}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                              style={{ background: colors.badge }}>{section.images?.length || 0}장</span>
                            <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="divide-y divide-gray-100">
                            {section.images?.map((img) => {
                              const imgKey = `${section.order}-${img.index}`;
                              const imgUrl = generatedImages[imgKey];
                              const isImgLoading = loadingImages[imgKey];
                              return (
                                <div key={img.index} className="p-4 bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ background: colors.bg, color: colors.badge }}>
                                      #{img.index} {img.type}
                                    </span>
                                    <button onClick={() => copy(`[${img.type}]\n${img.description}\n각도: ${img.angle}\n배경: ${img.background}\n소품: ${img.props}`, `img-${imgKey}`)}
                                      className="text-xs text-gray-400 hover:text-indigo-500 cursor-pointer">복사</button>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-2 leading-relaxed">{img.description}</p>
                                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                                    {[
                                      { label: "각도", value: img.angle },
                                      { label: "배경", value: img.background },
                                      { label: "소품", value: img.props || "없음" },
                                    ].map((item) => (
                                      <div key={item.label} className="bg-gray-50 rounded-lg p-2">
                                        <p className="text-xs text-gray-400">{item.label}</p>
                                        <p className="text-xs font-semibold text-gray-600">{item.value}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {img.text_overlay && (
                                    <div className="bg-indigo-50 rounded-lg px-3 py-2 mb-2">
                                      <p className="text-xs text-indigo-400">텍스트</p>
                                      <p className="text-xs font-bold text-indigo-700">"{img.text_overlay}"</p>
                                    </div>
                                  )}
                                  {img.why_better && (
                                    <div className="flex gap-1.5 items-start mb-3">
                                      <span className="text-green-500 text-xs">✓</span>
                                      <p className="text-xs text-green-600">{img.why_better}</p>
                                    </div>
                                  )}
                                  {/* AI 이미지 생성 영역 */}
                                  {img.ai_prompt && (
                                    <div>
                                      {!imgUrl ? (
                                        <button
                                          onClick={() => generateImage(imgKey, img.ai_prompt!)}
                                          className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border-2 border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50">
                                          🎨 AI 이미지 생성 (무료)
                                        </button>
                                      ) : (
                                        <div className="mt-1">
                                          <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ minHeight: 200 }}>
                                            {isImgLoading && (
                                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                                                <span className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-2" />
                                                <p className="text-xs text-gray-400">이미지 생성 중... (10~30초)</p>
                                              </div>
                                            )}
                                            <img
                                              src={imgUrl}
                                              alt={img.type}
                                              className="w-full rounded-xl"
                                              onLoad={() => setLoadingImages(prev => ({ ...prev, [imgKey]: false }))}
                                              onError={() => setLoadingImages(prev => ({ ...prev, [imgKey]: false }))}
                                            />
                                          </div>
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => downloadImage(imgUrl, `${img.type}_${imgKey}.jpg`)}
                                              className="flex-1 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                                              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                                              ⬇️ 다운로드
                                            </button>
                                            <button
                                              onClick={() => {
                                                setGeneratedImages(prev => { const n = { ...prev }; delete n[imgKey]; return n; });
                                                setLoadingImages(prev => { const n = { ...prev }; delete n[imgKey]; return n; });
                                              }}
                                              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 cursor-pointer hover:bg-gray-200">
                                              🔄 재생성
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 촬영 팁 */}
                  {imagePlan.shooting_tips?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-sm font-bold text-amber-700 mb-2">📷 실전 촬영 팁</p>
                      {imagePlan.shooting_tips.map((tip, i) => (
                        <div key={i} className="flex gap-2 items-start mb-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <p className="text-xs text-amber-700">{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 모바일 최적화 */}
                  {imagePlan.mobile_optimization?.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-bold text-blue-700 mb-2">📱 모바일 최적화</p>
                      {imagePlan.mobile_optimization.map((tip, i) => (
                        <div key={i} className="flex gap-2 items-start mb-1">
                          <span className="text-blue-400">•</span>
                          <p className="text-xs text-blue-600">{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 무료 도구 */}
                  {imagePlan.free_tools?.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-bold mb-2" style={{ color: "#1a1a2e" }}>🛠️ 추천 무료 도구</p>
                      {imagePlan.free_tools.map((tool, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 mb-1.5 flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-gray-700">{tool.tool}</p>
                            <p className="text-xs text-gray-500">{tool.purpose}</p>
                          </div>
                          <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{tool.url_hint}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-2xl mb-2">📸</p>
                  <p className="text-sm">이미지 기획 데이터를 불러오는 중입니다...</p>
                </div>
              )}
            </div>
          )}

          {/* 블로그 */}
          {activeSection === "blog" && result?.blog_post && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>네이버 블로그 포스팅</p>
                <CopyBtn text={`${result.blog_post.title}\n\n${result.blog_post.intro}\n\n${result.blog_post.body}\n\n${result.blog_post.outro}`} id="blog-all" />
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-bold text-green-600 mb-1">📌 SEO 최적화 제목</p>
                <p className="font-bold text-sm text-green-800">{result.blog_post.title}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">도입부</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.blog_post.intro}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">본문</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.blog_post.body}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">마무리</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.blog_post.outro}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {result.blog_post.tags?.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: "#f0f0ff", color: "#667eea" }}>#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* 인스타 */}
          {activeSection === "instagram" && result?.instagram && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white">📱 인스타그램 캡션</p>
                  <CopyBtn text={result.instagram.caption} id="insta-cap" />
                </div>
                <p className="text-sm text-white leading-relaxed">{result.instagram.caption}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500">스토리 문구</p>
                  <CopyBtn text={result.instagram.story_text} id="insta-story" />
                </div>
                <p className="text-sm text-gray-700">{result.instagram.story_text}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>해시태그</p>
                  <CopyBtn text={result.instagram.hashtags?.join(" ")} id="insta-hash" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.instagram.hashtags?.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: "#f0f0ff", color: "#667eea" }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 카카오 */}
          {activeSection === "kakao" && result?.kakao && (
            <div className="space-y-3">
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-yellow-700">💬 카카오채널 포스팅</p>
                  <CopyBtn text={result.kakao.channel_post} id="kakao-ch" />
                </div>
                <p className="text-sm text-yellow-800 leading-relaxed">{result.kakao.channel_post}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-yellow-700">📤 친구 공유 메시지</p>
                  <CopyBtn text={result.kakao.talk_message} id="kakao-talk" />
                </div>
                <p className="text-sm text-yellow-800 leading-relaxed">{result.kakao.talk_message}</p>
              </div>
            </div>
          )}

          {/* Canva 가이드 */}
          {activeSection === "canva" && result?.canva_guide && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 mb-1">🎨 Canva 썸네일 스타일 가이드</p>
                <p className="text-sm text-blue-800">{result.canva_guide.thumbnail_style}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">색상 조합</p>
                <p className="text-sm text-gray-700">{result.canva_guide.color_scheme}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">폰트 추천</p>
                <p className="text-sm text-gray-700">{result.canva_guide.font_suggestion}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">레이아웃 팁</p>
                <p className="text-sm text-gray-700">{result.canva_guide.layout_tip}</p>
              </div>
              <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                🎨 Canva에서 썸네일 만들기 →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
