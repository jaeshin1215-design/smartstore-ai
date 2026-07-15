"use client";

import { useState, useEffect } from "react";
import PolicyFilter from "@/components/PolicyFilter";
import ImageEditTab from "@/components/ImageEditTab";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

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
interface ImageSection { order: number; name: string; purpose: string; images: ImageItem[]; }
interface PotPrompt { title: string; prompt: string; }
interface ImagePlanResult {
  strategy: string; competitor_weakness: string;
  sections: ImageSection[]; total_images: number;
  shooting_tips: string[];
  pot_prompts?: { mood_cut: PotPrompt; cafe_cut: PotPrompt };
}

interface VideoScene {
  order: number;
  purpose: string;
  duration: 4 | 6 | 8 | 10;
  model: string;
  camera_move: string;
  risk_level: "안전" | "검수필수" | "위험";
  risk_reason: string;
  flow_prompt: string;
  photo_note?: string | null;
}
interface VideoPlanResult {
  strategy: string;
  scenes: VideoScene[];
  safety_note: string;
  photo_verified?: boolean;
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

const RISK_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  "안전":    { bg: "#f0fdf4", border: "#86efac", badge: "#16a34a", text: "#166534" },
  "검수필수": { bg: "#fffbeb", border: "#fde68a", badge: "#d97706", text: "#92400e" },
  "위험":    { bg: "#fef2f2", border: "#fecaca", badge: "#dc2626", text: "#991b1b" },
};

function buildPrompt(img: ImageItem, productName: string): string {
  if (img.ai_prompt) return img.ai_prompt;
  const typeMap: [string, string][] = [
    ["라이프스타일", "lifestyle photography, natural light, real people"],
    ["클로즈업", "macro close-up product photography, extreme detail"],
    ["비교", "before and after comparison product photography"],
    ["패키지", "product packaging photography, clean presentation"],
    ["성분", "ingredient flat lay photography, overhead shot"],
    ["정면", "professional front view product photography"],
  ];
  const typeHint = typeMap.find(([k]) => img.type.includes(k))?.[1] ?? "professional product photography";
  const parts = [
    typeHint, `of ${productName}`, img.angle,
    `${img.background} background`, img.props || "",
    "studio lighting, high quality, 8k, commercial photography",
  ].filter(Boolean);
  return parts.join(", ");
}

export default function ContentTab({ initialKeyword }: { initialKeyword?: string } = {}) {
  const [productName, setProductName] = useState(initialKeyword || "");

  useEffect(() => {
    if (initialKeyword) setProductName(initialKeyword);
  }, [initialKeyword]);

  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [price, setPrice] = useState("");
  const [uniquePoint, setUniquePoint] = useState("");
  const [result, setResult] = useState<ContentResult | null>(null);
  const [imagePlan, setImagePlan] = useState<ImagePlanResult | null>(null);
  const [videoPlan, setVideoPlan] = useState<VideoPlanResult | null>(null);
  const [loadingType, setLoadingType] = useState<"image" | "content" | "video" | null>(null);
  const [activeSection, setActiveSection] = useState("imageplan");
  const [copied, setCopied] = useState<string | null>(null);
  const [openImageSections, setOpenImageSections] = useState<number[]>([1]);
  const [mainView, setMainView] = useState<"content" | "imageedit">("content");
  const [productImageB64, setProductImageB64] = useState<string | null>(null);
  const [productImageMime, setProductImageMime] = useState<string>("image/jpeg");

  const payload = () => ({ productName, category, features, targetCustomer, price, uniquePoint });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProductImageB64(result.split(",")[1]);
      setProductImageMime(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const handleImagePlan = async () => {
    if (!productName) return;
    setLoadingType("image");
    setImagePlan(null);
    try {
      const res = await fetch("/api/imageplan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = await res.json();
      if (data.result) { setImagePlan(data.result); setOpenImageSections([1]); setActiveSection("imageplan"); }
    } catch { alert("오류가 발생했습니다."); }
    finally { setLoadingType(null); }
  };

  const handleContentSet = async () => {
    if (!productName) return;
    setLoadingType("content");
    setResult(null);
    try {
      const res = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = await res.json();
      if (data.result) { setResult(data.result); setActiveSection("marketing"); }
    } catch { alert("오류가 발생했습니다."); }
    finally { setLoadingType(null); }
  };

  const handleVideoPlan = async () => {
    if (!productName) return;
    setLoadingType("video");
    setVideoPlan(null);
    try {
      const res = await fetch("/api/videoplan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), productImageB64, productImageMime }),
      });
      const data = await res.json();
      if (data.result) { setVideoPlan(data.result); setActiveSection("videoplan"); }
    } catch { alert("오류가 발생했습니다."); }
    finally { setLoadingType(null); }
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

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)} style={{
      fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px",
      border: "1px solid #e5e7eb", background: copied === id ? "#f0fdf4" : "#fff",
      color: copied === id ? "#15803d" : "#6b7280", cursor: "pointer", fontFamily: FF, flexShrink: 0,
    }}>
      {copied === id ? "✓ 복사됨" : "📋 복사"}
    </button>
  );

  const TABS = [
    { id: "imageplan", label: "이미지 기획" },
    { id: "videoplan", label: "영상 기획" },
    { id: "marketing", label: "카피" },
    { id: "thumbnail", label: "썸네일" },
    { id: "detail", label: "상세페이지" },
    { id: "blog", label: "블로그" },
    { id: "instagram", label: "인스타" },
    { id: "kakao", label: "카카오" },
    { id: "canva", label: "Canva" },
  ];

  const hasAnyResult = !!(result || imagePlan || videoPlan);

  return (
    <div style={{ width: "100%", fontFamily: FF, display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* 사이드바 */}
      <div style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed", position: "sticky", top: "60px" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>CONTENT</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>콘텐츠를,<br />한 번에</p>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.5 }}>이미지·영상·마케팅<br />선택 생성</p>

        {/* 매일 하는 일 */}
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "6px" }}>매일 하는 일</p>
        {[
          { label: "이미지 기획", id: "imageplan", hasResult: !!imagePlan },
          { label: "영상 기획", id: "videoplan", hasResult: !!videoPlan },
        ].map((f) => {
          const isActive = activeSection === f.id && f.hasResult;
          return (
            <div key={f.id}
              onClick={() => f.hasResult && setActiveSection(f.id)}
              style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", cursor: f.hasResult ? "pointer" : "default" }}>
              <span style={{ fontSize: "10px", color: f.hasResult ? (isActive ? "#ef567c" : "#16a34a") : "#e5e7eb", flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: "13px", color: isActive ? "#ef567c" : f.hasResult ? "#374151" : "#c0c4cc", fontWeight: isActive ? 600 : 400 }}>{f.label}</span>
            </div>
          );
        })}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "10px 0 10px" }} />

        {/* 한 번에 세트 */}
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "6px" }}>한 번에 세트</p>
        {[
          { label: "카피", id: "marketing" },
          { label: "썸네일", id: "thumbnail" },
          { label: "상세페이지", id: "detail" },
          { label: "블로그", id: "blog" },
          { label: "인스타", id: "instagram" },
          { label: "카카오", id: "kakao" },
          { label: "Canva", id: "canva" },
        ].map((f) => {
          const isActive = activeSection === f.id && !!result;
          return (
            <div key={f.id}
              onClick={() => result && setActiveSection(f.id)}
              style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", cursor: result ? "pointer" : "default" }}>
              <span style={{ fontSize: "10px", color: result ? (isActive ? "#ef567c" : "#16a34a") : "#e5e7eb", flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: "13px", color: isActive ? "#ef567c" : result ? "#374151" : "#c0c4cc", fontWeight: isActive ? 600 : 400 }}>{f.label}</span>
            </div>
          );
        })}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "10px 0 10px" }} />

        {/* 수시 도구 */}
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "6px" }}>수시 도구</p>
        {[{ label: "이미지 편집", id: "imageedit" }].map((f) => {
          const isActive = mainView === f.id;
          return (
            <div key={f.id}
              onClick={() => setMainView(mainView === f.id ? "content" : "imageedit" as "content" | "imageedit")}
              style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", cursor: "pointer", borderRadius: 6, padding: "4px 6px", background: isActive ? "#fff3f6" : "transparent" }}>
              <span style={{ fontSize: "10px", color: isActive ? "#ef567c" : "#c0c4cc", flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: "13px", color: isActive ? "#ef567c" : "#8f9399", fontWeight: isActive ? 700 : 400 }}>{f.label}</span>
            </div>
          );
        })}
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* 이미지 편집 뷰 */}
        {mainView === "imageedit" && <ImageEditTab />}

        {/* 콘텐츠 생성 뷰 */}
        {mainView === "content" && (
        <div style={{ maxWidth: "840px", margin: "0 auto", paddingBottom: "80px" }}>

          {/* 헤더 */}
          <div style={{ marginBottom: "18px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#111827", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              All in One 콘텐츠
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              이미지 기획·영상 기획·마케팅 세트 — 원하는 것만 선택 생성
            </p>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "28px" }} />

          {/* 입력 폼 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                상품명 <span style={{ color: "#ef567c" }}>*</span>
              </label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                placeholder="예) 국산 유기농 아로니아 분말 500g"
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#111827", outline: "none", fontFamily: FF, boxSizing: "border-box" }} />
            </div>
            {/* 실물 제품사진 업로드 — 영상 기획 위험도 대조에 사용 */}
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                실물 제품사진 <span style={{ fontSize: "12px", fontWeight: 400, color: "#9ca3af" }}>(선택 — 영상 기획 허위광고 위험도 대조)</span>
              </label>
              {productImageB64 ? (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", border: "1px solid #86efac", borderRadius: "8px", background: "#f0fdf4" }}>
                  <img src={`data:${productImageMime};base64,${productImageB64}`} alt="제품사진" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#15803d", margin: 0 }}>실물 사진 업로드 완료</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0" }}>영상 기획 생성 시 자동으로 위험도 대조에 사용됩니다</p>
                  </div>
                  <button onClick={() => setProductImageB64(null)} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: FF, flexShrink: 0 }}>
                    제거
                  </button>
                </div>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "16px", border: "2px dashed #e5e7eb", borderRadius: "8px", cursor: "pointer", background: "#fafafa" }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                  <span style={{ fontSize: "20px" }}>📷</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280" }}>클릭하여 실물 제품사진 업로드</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>ImageEditTab에서 이미 업로드한 사진이 있으면 자동 연결됩니다 (준비 중)</span>
                </label>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                  카테고리 <span style={{ fontSize: "12px", fontWeight: 400, color: "#9ca3af" }}>(선택)</span>
                </label>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                  placeholder="예) 식품 > 건강식품"
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#111827", outline: "none", fontFamily: FF, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                  판매가 <span style={{ fontSize: "12px", fontWeight: 400, color: "#9ca3af" }}>(선택)</span>
                </label>
                <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="예) 19,900원"
                  style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#111827", outline: "none", fontFamily: FF, boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                주요 특징 <span style={{ fontSize: "12px", fontWeight: 400, color: "#9ca3af" }}>(선택)</span>
              </label>
              <input type="text" value={features} onChange={(e) => setFeatures(e.target.value)}
                placeholder="예) 유기농 인증, 국산 원료, 당일 발송, 무농약"
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#111827", outline: "none", fontFamily: FF, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                타겟 고객 <span style={{ fontSize: "12px", fontWeight: 400, color: "#9ca3af" }}>(선택)</span>
              </label>
              <input type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="예) 건강 관리하는 30~50대 여성"
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#111827", outline: "none", fontFamily: FF, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                경쟁사 대비 차별점 <span style={{ fontSize: "12px", fontWeight: 400, color: "#9ca3af" }}>(선택)</span>
              </label>
              <input type="text" value={uniquePoint} onChange={(e) => setUniquePoint(e.target.value)}
                placeholder="예) 타사 대비 안토시아닌 함량 3배, 소분 포장"
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#111827", outline: "none", fontFamily: FF, boxSizing: "border-box" }} />
            </div>

            {/* 버튼 3개 */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={handleImagePlan} disabled={loadingType !== null || !productName} style={{
                flex: 1, minWidth: "140px", padding: "11px 16px", borderRadius: "8px", border: "none",
                fontSize: "13px", fontWeight: 700, color: "#fff", cursor: (loadingType !== null || !productName) ? "not-allowed" : "pointer",
                background: "#ef567c", opacity: (loadingType !== null || !productName) ? 0.5 : 1, fontFamily: FF,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                {loadingType === "image" ? (
                  <>
                    <span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    생성 중...
                  </>
                ) : "📸 이미지 기획 생성"}
              </button>

              <button onClick={handleVideoPlan} disabled={loadingType !== null || !productName} style={{
                flex: 1, minWidth: "140px", padding: "11px 16px", borderRadius: "8px", border: "none",
                fontSize: "13px", fontWeight: 700, color: "#fff", cursor: (loadingType !== null || !productName) ? "not-allowed" : "pointer",
                background: "#16a34a", opacity: (loadingType !== null || !productName) ? 0.5 : 1, fontFamily: FF,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                {loadingType === "video" ? (
                  <>
                    <span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    생성 중...
                  </>
                ) : "🎬 영상 기획 생성"}
              </button>

              <button onClick={handleContentSet} disabled={loadingType !== null || !productName} style={{
                flex: 1, minWidth: "140px", padding: "11px 16px", borderRadius: "8px", border: "none",
                fontSize: "13px", fontWeight: 700, color: "#fff", cursor: (loadingType !== null || !productName) ? "not-allowed" : "pointer",
                background: "#2563eb", opacity: (loadingType !== null || !productName) ? 0.5 : 1, fontFamily: FF,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                {loadingType === "content" ? (
                  <>
                    <span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    생성 중...
                  </>
                ) : "🚀 마케팅 콘텐츠 세트 생성"}
              </button>
            </div>
          </div>

          {/* 결과 영역 */}
          {hasAnyResult && (
            <div>
              <div style={{ borderTop: "1px solid #e5e7eb", margin: "28px 0 20px" }} />

              {/* 탭 바 */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
                {TABS.map((s) => {
                  const isActive = activeSection === s.id;
                  return (
                    <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                      whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "7px",
                      fontSize: "13px", fontWeight: isActive ? 700 : 500, cursor: "pointer",
                      border: isActive ? "none" : "1px solid #e5e7eb",
                      background: isActive ? "#ef567c" : "#fff",
                      color: isActive ? "#fff" : "#6b7280", fontFamily: FF,
                    }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* 이미지 기획 */}
              {activeSection === "imageplan" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {imagePlan ? (
                    <>
                      <div style={{ background: "#ef567c", borderRadius: "12px", padding: "16px" }}>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>📸 이미지 전략</p>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>{imagePlan.strategy}</p>
                        {imagePlan.total_images && (
                          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>총 {imagePlan.total_images}장 구성 제안</p>
                        )}
                      </div>
                      {imagePlan.pot_prompts && (
                        <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "12px", padding: "16px" }}>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#047857", margin: "0 0 10px" }}>🪴 화분 전용 AI 프롬프트</p>
                          {/* 필수 경고 — 팁 아님 */}
                          <div style={{ background: "#fef2f2", border: "1.5px solid #f87171", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
                            <p style={{ fontSize: "12.5px", fontWeight: 800, color: "#dc2626", margin: 0, lineHeight: 1.65 }}>
                              ⚠️ 이 프롬프트는 반드시 ①실물사진 Add Image → ②Cutout(BEN2) → Outpaint 단계에서 사용해야 크기가 정확합니다. 사진 없이 텍스트만으로 새 이미지를 생성하면 크기가 왜곡될 수 있습니다.
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#065f46", margin: 0 }}>① Add Image → ② Cutout(BEN2) → ③ Outpaint</p>
                            <a href="https://labs.google/fx/tools/flow" target="_blank" rel="noopener noreferrer" style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontSize: "12.5px", fontWeight: 700, color: "#fff", padding: "5px 12px",
                              borderRadius: "7px", background: "#059669", textDecoration: "none",
                            }}>Google Flow 열기 ↗</a>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
                            {([["pot_mood", imagePlan.pot_prompts.mood_cut], ["pot_cafe", imagePlan.pot_prompts.cafe_cut]] as const).map(([key, p]) => (
                              <div key={key} style={{ background: "#fff", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "12px 14px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#047857" }}>{p.title}</span>
                                  <button onClick={() => copy(p.prompt, key)} style={{
                                    fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FF,
                                    color: copied === key ? "#fff" : "#059669",
                                    background: copied === key ? "#059669" : "#ecfdf5",
                                    border: "1px solid #6ee7b7", borderRadius: "6px", padding: "3px 10px",
                                  }}>{copied === key ? "복사됨 ✓" : "복사"}</button>
                                </div>
                                <p style={{ fontSize: "12px", color: "#374151", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{p.prompt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {imagePlan.competitor_weakness && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px 16px" }}>
                          <p style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626", margin: "0 0 4px" }}>⚠️ 경쟁사 약점</p>
                          <p style={{ fontSize: "14px", color: "#b91c1c", margin: 0 }}>{imagePlan.competitor_weakness}</p>
                        </div>
                      )}
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                          <span style={{ fontSize: "18px" }}>🎬</span>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: "#15803d", margin: 0 }}>Google Flow — 이미지 → 영상까지 한 곳에서</p>
                            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>labs.google/fx/tools/flow · 무료 50 크레딧/일 · 이미지 모델: Nano Banana 2</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                          {[
                            "① 프롬프트 상자에서 Image 선택 → 비율 9:16 · Nano Banana 2 설정",
                            "② 아래 AI 프롬프트 복사 → labs.google/fx/tools/flow에 붙여넣기 → 생성",
                            "③ 마음에 들면 4K 업스케일링 → 영상(Veo 3.1 Quality)으로 변환",
                            "④ 크레딧 절약: 이미지 완성 후 영상 변환 순서 지키기",
                          ].map((step, i) => (
                            <p key={i} style={{ fontSize: "13px", color: "#166534", margin: 0, lineHeight: 1.6 }}>{step}</p>
                          ))}
                        </div>
                        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}>
                          <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", margin: "0 0 4px" }}>⚠️ 허위광고 주의 (커머스 필수)</p>
                          <p style={{ fontSize: "12px", color: "#78350f", margin: 0, lineHeight: 1.6 }}>AI는 제품을 "해석해 새로 그림" → 실물과 다를 수 있음. 상세페이지 메인 제품 컷은 반드시 실물 사진 유지. 배경·분위기 영상에만 사용 권장.</p>
                        </div>
                        <a href="https://labs.google/fx/tools/flow" target="_blank" rel="noopener noreferrer" style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          fontSize: "13px", fontWeight: 700, color: "#fff", padding: "7px 16px",
                          borderRadius: "7px", background: "#16a34a", textDecoration: "none",
                        }}>🎬 Google Flow 열기 →</a>
                      </div>
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px 16px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", margin: "0 0 6px" }}>💡 기타 AI 이미지 생성 도구</p>
                        <p style={{ fontSize: "14px", color: "#1d4ed8", margin: "0 0 10px", lineHeight: 1.6 }}>각 섹션의 AI 프롬프트를 복사한 뒤 아래 도구에 붙여넣으면 고품질 이미지를 생성할 수 있습니다.</p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {[
                            { label: "Bing AI (무료·빠름)", color: "#0078d4", url: "https://www.bing.com/images/create" },
                            { label: "Leonardo.ai (무료)", color: "#7c3aed", url: "https://app.leonardo.ai/ai-generations" },
                            { label: "Adobe Firefly (무료)", color: "#ef567c", url: "https://firefly.adobe.com/generate/images" },
                          ].map((tool) => (
                            <a key={tool.label} href={tool.url} target="_blank" rel="noopener noreferrer" style={{
                              fontSize: "12px", fontWeight: 700, color: "#fff", padding: "5px 12px", borderRadius: "6px",
                              background: tool.color, textDecoration: "none",
                            }}>{tool.label}</a>
                          ))}
                        </div>
                      </div>
                      {imagePlan.sections?.map((section) => {
                        const colors = SECTION_COLORS[section.order] || SECTION_COLORS[1];
                        const isOpen = openImageSections.includes(section.order);
                        return (
                          <div key={section.order} style={{ border: `1px solid ${colors.border}`, borderRadius: "12px", overflow: "hidden" }}>
                            <button onClick={() => toggleImageSection(section.order)} style={{
                              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "12px 16px", background: colors.bg, border: "none", cursor: "pointer", fontFamily: FF, textAlign: "left",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: colors.badge, color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{section.order}</span>
                                <div>
                                  <p style={{ fontSize: "14px", fontWeight: 700, color: colors.text, margin: 0 }}>{section.name}</p>
                                  <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>{section.purpose}</p>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", padding: "2px 8px", borderRadius: "6px", background: colors.badge }}>{section.images?.length || 0}장</span>
                                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</span>
                              </div>
                            </button>
                            {isOpen && (
                              <div>
                                {section.images?.map((img) => {
                                  const prompt = buildPrompt(img, productName);
                                  const promptKey = `prompt-${section.order}-${img.index}`;
                                  return (
                                    <div key={img.index} style={{ padding: "16px", background: "#fff", borderTop: `1px solid ${colors.border}` }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: colors.bg, color: colors.badge }}>#{img.index} {img.type}</span>
                                        <button onClick={() => copy(`[${img.type}]\n${img.description}\n각도: ${img.angle}\n배경: ${img.background}`, `img-${promptKey}`)} style={{ fontSize: "13px", color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: FF }}>복사</button>
                                      </div>
                                      <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, margin: "0 0 10px" }}>{img.description}</p>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                                        {[{ label: "각도", value: img.angle }, { label: "배경", value: img.background }, { label: "소품", value: img.props || "없음" }].map((item) => (
                                          <div key={item.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 10px" }}>
                                            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 2px" }}>{item.label}</p>
                                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", margin: 0 }}>{item.value}</p>
                                          </div>
                                        ))}
                                      </div>
                                      {img.text_overlay && (
                                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 12px", marginBottom: "8px" }}>
                                          <p style={{ fontSize: "12px", color: "#2563eb", margin: "0 0 2px" }}>텍스트 오버레이</p>
                                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1d4ed8", margin: 0 }}>"{img.text_overlay}"</p>
                                        </div>
                                      )}
                                      {img.why_better && (
                                        <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "12px" }}>
                                          <span style={{ color: "#16a34a", fontSize: "13px" }}>✓</span>
                                          <p style={{ fontSize: "13px", color: "#15803d", margin: 0, lineHeight: 1.5 }}>{img.why_better}</p>
                                        </div>
                                      )}
                                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                          <p style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", margin: 0 }}>🤖 AI 이미지 생성 프롬프트</p>
                                          <button onClick={() => copy(prompt, promptKey)} style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", background: copied === promptKey ? "#f0fdf4" : "#fff", color: copied === promptKey ? "#15803d" : "#2563eb", cursor: "pointer", fontFamily: FF }}>
                                            {copied === promptKey ? "✓ 복사됨" : "📋 복사"}
                                          </button>
                                        </div>
                                        <p style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace", lineHeight: 1.6, margin: "0 0 10px", wordBreak: "break-all" }}>{prompt}</p>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                          <button onClick={() => { copy(prompt, promptKey); window.open("https://labs.google/fx/tools/flow", "_blank"); }} style={{ fontSize: "12px", fontWeight: 700, color: "#fff", padding: "6px 12px", borderRadius: "6px", border: "none", background: "#16a34a", cursor: "pointer", fontFamily: FF }}>🎬 Google Flow</button>
                                          <button onClick={() => { copy(prompt, promptKey); window.open(`https://www.bing.com/images/create?q=${encodeURIComponent(prompt)}`, "_blank"); }} style={{ fontSize: "12px", fontWeight: 700, color: "#fff", padding: "6px 12px", borderRadius: "6px", border: "none", background: "#0078d4", cursor: "pointer", fontFamily: FF }}>🚀 Bing AI</button>
                                          <button onClick={() => { copy(prompt, promptKey); window.open("https://app.leonardo.ai/ai-generations", "_blank"); }} style={{ fontSize: "12px", fontWeight: 700, color: "#fff", padding: "6px 12px", borderRadius: "6px", border: "none", background: "#7c3aed", cursor: "pointer", fontFamily: FF }}>Leonardo</button>
                                        </div>
                                        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "8px 0 0" }}>💡 복사 후 labs.google/fx/tools/flow 또는 Bing AI에 붙여넣기(Ctrl+V)하면 즉시 생성됩니다</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {imagePlan.shooting_tips?.length > 0 && (
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "16px" }}>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", margin: "0 0 10px" }}>📷 촬영 팁</p>
                          {imagePlan.shooting_tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "6px" }}>
                              <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#f59e0b", color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                              <p style={{ fontSize: "14px", color: "#92400e", margin: 0, lineHeight: 1.6 }}>{tip}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                      <p style={{ fontSize: "28px", margin: "0 0 8px" }}>📸</p>
                      <p style={{ fontSize: "14px", margin: 0 }}>상품명 입력 후 "이미지 기획 생성"을 클릭해주세요</p>
                    </div>
                  )}
                </div>
              )}

              {/* 영상 기획 */}
              {activeSection === "videoplan" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {videoPlan ? (
                    <>
                      {/* 전략 카드 */}
                      <div style={{ background: "#ef567c", borderRadius: "12px", padding: "16px" }}>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>🎬 영상 캠페인 전략</p>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>{videoPlan.strategy}</p>
                      </div>

                      {/* 안전 노트 */}
                      {videoPlan.safety_note && (
                        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "12px", padding: "14px 16px" }}>
                          <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", margin: "0 0 4px" }}>⚠️ 제품 정확도 원칙</p>
                          <p style={{ fontSize: "13px", color: "#78350f", margin: 0, lineHeight: 1.6 }}>{videoPlan.safety_note}</p>
                        </div>
                      )}

                      {/* 실물사진 대조 결과 배지 */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${videoPlan.photo_verified ? "#86efac" : "#fde68a"}`, background: videoPlan.photo_verified ? "#f0fdf4" : "#fffbeb" }}>
                        <span style={{ fontSize: "14px" }}>{videoPlan.photo_verified ? "📸" : "⚠️"}</span>
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: 700, color: videoPlan.photo_verified ? "#15803d" : "#92400e", margin: 0 }}>
                            {videoPlan.photo_verified ? "실물사진 검증됨" : "실물사진 미대조"}
                          </p>
                          <p style={{ fontSize: "11px", color: videoPlan.photo_verified ? "#6b7280" : "#92400e", margin: 0 }}>
                            {videoPlan.photo_verified ? "업로드 사진과 색상·형태 대조 완료 — 각 씬 위험도 재판정됨" : "실물사진 없이 텍스트 설명만으로 위험도 추측 중"}
                          </p>
                        </div>
                      </div>

                      {/* 위험도 범례 */}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {(["안전", "검수필수", "위험"] as const).map((level) => {
                          const c = RISK_COLORS[level];
                          return (
                            <span key={level} style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", background: c.bg, border: `1px solid ${c.border}`, color: c.badge }}>
                              {level === "안전" ? "🟢" : level === "검수필수" ? "🟡" : "🔴"} {level}
                            </span>
                          );
                        })}
                        <span style={{ fontSize: "12px", color: "#9ca3af", alignSelf: "center" }}>— 각 씬별 허위광고 위험도</span>
                      </div>

                      {/* 씬별 카드 */}
                      {videoPlan.scenes?.map((scene) => {
                        const c = RISK_COLORS[scene.risk_level] || RISK_COLORS["안전"];
                        const promptKey = `video-scene-${scene.order}`;
                        return (
                          <div key={scene.order} style={{ border: `1px solid ${c.border}`, borderRadius: "12px", overflow: "hidden" }}>
                            {/* 씬 헤더 */}
                            <div style={{ background: c.bg, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: c.badge, color: "#fff", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {scene.order}
                                </span>
                                <div>
                                  <p style={{ fontSize: "14px", fontWeight: 700, color: c.text, margin: 0 }}>{scene.purpose}</p>
                                  <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{scene.duration}초</span>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>·</span>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{scene.model}</span>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>·</span>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{scene.camera_move}</span>
                                  </div>
                                </div>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", background: c.badge, color: "#fff", flexShrink: 0 }}>
                                {scene.risk_level}
                              </span>
                            </div>

                            {/* 씬 본문 */}
                            <div style={{ padding: "14px 16px", background: "#fff", display: "flex", flexDirection: "column", gap: "10px" }}>
                              {/* 위험도 이유 */}
                              <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "13px", color: c.badge, flexShrink: 0 }}>
                                  {scene.risk_level === "안전" ? "✓" : scene.risk_level === "검수필수" ? "!" : "⚠"}
                                </span>
                                <p style={{ fontSize: "13px", color: c.text, margin: 0, lineHeight: 1.5 }}>{scene.risk_reason}</p>
                              </div>

                              {/* 실물사진 대조 노트 (사진 있을 때만) */}
                              {scene.photo_note && (
                                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", padding: "8px 10px", borderRadius: "6px", background: "#f0fdf4", border: "1px solid #86efac" }}>
                                  <span style={{ fontSize: "12px", flexShrink: 0 }}>📸</span>
                                  <p style={{ fontSize: "12px", color: "#15803d", margin: 0, lineHeight: 1.5, fontWeight: 600 }}>{scene.photo_note}</p>
                                </div>
                              )}

                              {/* Flow 프롬프트 */}
                              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 14px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#15803d", margin: 0 }}>🎬 Google Flow 프롬프트</p>
                                  <button onClick={() => copy(scene.flow_prompt, promptKey)} style={{
                                    fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px",
                                    border: "1px solid #86efac", background: copied === promptKey ? "#dcfce7" : "#fff",
                                    color: copied === promptKey ? "#15803d" : "#16a34a", cursor: "pointer", fontFamily: FF,
                                  }}>
                                    {copied === promptKey ? "✓ 복사됨" : "📋 복사"}
                                  </button>
                                </div>
                                <p style={{ fontSize: "12px", color: "#374151", fontFamily: "monospace", lineHeight: 1.7, margin: "0 0 10px", wordBreak: "break-all" }}>{scene.flow_prompt}</p>
                                <button onClick={() => { copy(scene.flow_prompt, promptKey); window.open("https://labs.google/fx/tools/flow", "_blank"); }} style={{
                                  fontSize: "12px", fontWeight: 700, color: "#fff", padding: "6px 14px", borderRadius: "6px",
                                  border: "none", background: "#16a34a", cursor: "pointer", fontFamily: FF,
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                }}>
                                  🎬 복사 후 Google Flow 열기 →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Google Flow 안내 */}
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px 16px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", margin: "0 0 6px" }}>💡 Google Flow 영상 생성 가이드</p>
                        {[
                          "① labs.google/fx/tools/flow → 프롬프트 상자 → Video 선택",
                          "② 모델: Quality (커머스 추천 · 왜곡 적음)",
                          "③ 길이: 각 씬에 명시된 초 선택",
                          "④ 프롬프트 복사 후 붙여넣기 → 생성",
                          "⑤ 무료 50 크레딧/일 — 크레딧 절약: '안전' 씬 먼저 확인",
                        ].map((step, i) => (
                          <p key={i} style={{ fontSize: "13px", color: "#1d4ed8", margin: "0 0 4px", lineHeight: 1.6 }}>{step}</p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                      <p style={{ fontSize: "28px", margin: "0 0 8px" }}>🎬</p>
                      <p style={{ fontSize: "14px", margin: 0 }}>상품명 입력 후 "영상 기획 생성"을 클릭해주세요</p>
                    </div>
                  )}
                </div>
              )}

              {/* 마케팅 카피 */}
              {activeSection === "marketing" && result?.marketing_copies && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>마케팅 카피 3종</p>
                  {result.marketing_copies.map((c, i) => (
                    <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", padding: "3px 10px", borderRadius: "6px", background: i === 0 ? "#ef567c" : i === 1 ? "#2563eb" : "#16a34a" }}>{c.type}</span>
                        <CopyBtn text={`${c.copy}\n${c.sub}`} id={`copy-${i}`} />
                      </div>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{c.copy}</p>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>{c.sub}</p>
                    </div>
                  ))}
                  <PolicyFilter text={result.marketing_copies.map((c) => `${c.copy} ${c.sub}`).join(" ")} />
                </div>
              )}

              {/* 썸네일 */}
              {activeSection === "thumbnail" && result?.thumbnail_sets && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>썸네일 문구 세트 3종</p>
                  {result.thumbnail_sets.map((t, i) => (
                    <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>세트 {i + 1}</span>
                        <CopyBtn text={`메인: ${t.main}\n서브: ${t.sub}\n뱃지: ${t.badge}`} id={`thumb-${i}`} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[{ label: "메인", value: t.main }, { label: "서브", value: t.sub }, { label: "뱃지", value: t.badge }].map((row) => (
                          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#9ca3af", width: "32px", flexShrink: 0 }}>{row.label}</span>
                            <span style={{ fontSize: row.label === "메인" ? "16px" : "14px", fontWeight: row.label === "메인" ? 700 : 400, color: "#111827" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 상세페이지 */}
              {activeSection === "detail" && result?.detail_page && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <CopyBtn text={`[후킹] ${result.detail_page.hook}\n\n[문제] ${result.detail_page.problem}\n\n[해결] ${result.detail_page.solution}\n\n[신뢰] ${result.detail_page.trust}\n\n[긴급] ${result.detail_page.urgency}\n\n[CTA] ${result.detail_page.cta}`} id="detail-all" />
                  </div>
                  {[
                    { label: "⚡ 후킹 문구", value: result.detail_page.hook, bg: "#ef567c", color: "#fff" },
                    { label: "😓 문제 공감", value: result.detail_page.problem, bg: "#fee2e2", color: "#b91c1c" },
                    { label: "✅ 해결책", value: result.detail_page.solution, bg: "#dbeafe", color: "#1d4ed8" },
                    { label: "🏆 신뢰 증거", value: result.detail_page.trust, bg: "#d1fae5", color: "#065f46" },
                    { label: "🔥 긴급성", value: result.detail_page.urgency, bg: "#ffedd5", color: "#c2410c" },
                    { label: "🛒 구매 유도", value: result.detail_page.cta, bg: "#fdf4ff", color: "#7c3aed" },
                  ].map((item, i) => (
                    <div key={i} style={{ background: item.bg, borderRadius: "12px", padding: "16px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: item.color, opacity: 0.8, margin: "0 0 4px" }}>{item.label}</p>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: item.color, margin: 0, lineHeight: 1.6 }}>{item.value}</p>
                    </div>
                  ))}
                  {result.detail_page.features?.map((f, i) => (
                    <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{f.title}</p>
                      <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 4px", lineHeight: 1.6 }}>{f.desc}</p>
                      <p style={{ fontSize: "13px", color: "#2563eb", margin: 0 }}>📷 {f.image_guide}</p>
                    </div>
                  ))}
                  {result.detail_page.faq?.map((f, i) => (
                    <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 16px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Q. {f.q}</p>
                      <p style={{ fontSize: "14px", color: "#4b5563", margin: 0 }}>A. {f.a}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 블로그 */}
              {activeSection === "blog" && result?.blog_post && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>네이버 블로그 포스팅</p>
                    <CopyBtn text={`${result.blog_post.title}\n\n${result.blog_post.intro}\n\n${result.blog_post.body}\n\n${result.blog_post.outro}`} id="blog-all" />
                  </div>
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#15803d", margin: "0 0 4px" }}>📌 SEO 최적화 제목</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#14532d", margin: 0 }}>{result.blog_post.title}</p>
                  </div>
                  {[{ label: "도입부", value: result.blog_post.intro }, { label: "본문", value: result.blog_post.body }, { label: "마무리", value: result.blog_post.outro }].map((s) => (
                    <div key={s.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", margin: "0 0 8px" }}>{s.label}</p>
                      <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, margin: 0, whiteSpace: "pre-line" }}>{s.value}</p>
                    </div>
                  ))}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {result.blog_post.tags?.map((tag, i) => (
                      <span key={i} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 인스타 */}
              {activeSection === "instagram" && result?.instagram && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#fff", margin: 0 }}>📱 캡션</p>
                      <CopyBtn text={result.instagram.caption} id="insta-cap" />
                    </div>
                    <p style={{ fontSize: "14px", color: "#fff", lineHeight: 1.75, margin: 0 }}>{result.instagram.caption}</p>
                  </div>
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", margin: 0 }}>스토리 문구</p>
                      <CopyBtn text={result.instagram.story_text} id="insta-story" />
                    </div>
                    <p style={{ fontSize: "14px", color: "#4b5563", margin: 0 }}>{result.instagram.story_text}</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>해시태그</p>
                      <CopyBtn text={result.instagram.hashtags?.join(" ")} id="insta-hash" />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {result.instagram.hashtags?.map((tag, i) => (
                        <span key={i} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "#fdf4ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 카카오 */}
              {activeSection === "kakao" && result?.kakao && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[{ label: "💬 채널 포스팅", value: result.kakao.channel_post, id: "kakao-ch" }, { label: "📤 친구 공유", value: result.kakao.talk_message, id: "kakao-talk" }].map((item) => (
                    <div key={item.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", margin: 0 }}>{item.label}</p>
                        <CopyBtn text={item.value} id={item.id} />
                      </div>
                      <p style={{ fontSize: "14px", color: "#78350f", lineHeight: 1.75, margin: 0 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Canva */}
              {activeSection === "canva" && result?.canva_guide && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "🎨 썸네일 스타일", value: result.canva_guide.thumbnail_style, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
                    { label: "🎨 색상 조합", value: result.canva_guide.color_scheme, bg: "#f9fafb", border: "#e5e7eb", color: "#374151" },
                    { label: "✍️ 폰트", value: result.canva_guide.font_suggestion, bg: "#f9fafb", border: "#e5e7eb", color: "#374151" },
                    { label: "📐 레이아웃 팁", value: result.canva_guide.layout_tip, bg: "#f9fafb", border: "#e5e7eb", color: "#374151" },
                  ].map((item) => (
                    <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: "12px", padding: "16px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: item.color, margin: "0 0 4px", opacity: 0.8 }}>{item.label}</p>
                      <p style={{ fontSize: "14px", color: item.color, margin: 0, lineHeight: 1.6 }}>{item.value}</p>
                    </div>
                  ))}
                  <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "12px 24px", borderRadius: "8px", border: "1px solid #bfdbfe",
                    fontSize: "14px", fontWeight: 600, color: "#2563eb", textDecoration: "none", background: "#fff",
                  }}>
                    🎨 Canva에서 만들기 →
                  </a>
                </div>
              )}
            </div>
          )}

        </div>
        )}
      </div>
    </div>
  );
}
