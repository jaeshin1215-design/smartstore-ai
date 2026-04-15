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

export default function ContentTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [price, setPrice] = useState("");
  const [uniquePoint, setUniquePoint] = useState("");
  const [result, setResult] = useState<ContentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("marketing");
  const [copied, setCopied] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, features, targetCustomer, price, uniquePoint }),
      });
      const data = await res.json();
      if (data.result) { setResult(data.result); setActiveSection("marketing"); }
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
      <p className="text-gray-400 text-sm mb-6">상품 정보 한 번 입력 → 마케팅 카피·블로그·인스타·상세페이지 한 번에 완성!</p>

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
              모든 콘텐츠 생성 중... (약 10~15초)
            </span>
          ) : "🚀 모든 콘텐츠 한 번에 생성하기"}
        </button>
      </div>

      {result && (
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
          {activeSection === "marketing" && result.marketing_copies && (
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
          {activeSection === "thumbnail" && result.thumbnail_sets && (
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
          {activeSection === "detail" && result.detail_page && (
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

          {/* 블로그 */}
          {activeSection === "blog" && result.blog_post && (
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
          {activeSection === "instagram" && result.instagram && (
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
          {activeSection === "kakao" && result.kakao && (
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
          {activeSection === "canva" && result.canva_guide && (
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
