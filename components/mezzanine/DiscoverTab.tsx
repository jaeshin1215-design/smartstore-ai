"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import {
  FONT_SERIF, FONT_BODY,
  COLOR_INK, COLOR_SUB, COLOR_RULE, COLOR_ACCENT,
  TEXT_CAPTION_SIZE, TRACKING_OVERLINE,
} from "@/lib/tokens";

const CATS = [
  { id: "performance", label: "공연·굿즈",   catEn: "PERFORM",  tag: "★", verified: true,  comment: "라이콘 실증",    headliner_only: false },
  { id: "bakery_fb",   label: "F&B·베이커리", catEn: "BAKERY",   tag: "★", verified: true,  comment: "빵력장터 실증",  headliner_only: true  },
  { id: "wellness",    label: "웰니스",        catEn: "WELLNESS", tag: "★", verified: true,  comment: "MOVFLEX 실증",  headliner_only: false },
  { id: "outdoor",     label: "캠핑·아웃도어", catEn: "OUTDOOR",  tag: "⚡", verified: true, comment: "실제 문의",       headliner_only: false },
  { id: "fashion",     label: "패션",          catEn: "FASHION",  tag: "☆", verified: false, comment: "서울 시장 26%", headliner_only: false },
  { id: "ip_content",  label: "IP·콘텐츠",     catEn: "IP",       tag: "☆", verified: false, comment: "서울 시장 17%", headliner_only: false },
  { id: "beauty",      label: "뷰티",          catEn: "BEAUTY",   tag: "☆", verified: false, comment: "시장 근거, 미검증", headliner_only: false },
] as const;
type CatId = typeof CATS[number]["id"];

const OP_TYPES = [
  { id: "all",    label: "전체" },
  { id: "event",  label: "이벤트 (단기)" },
  { id: "steady", label: "상설 (입점)" },
] as const;
type OpTypeId = typeof OP_TYPES[number]["id"];

const CTA_TARGET: Record<CatId, string> = {
  performance: "diagnose", bakery_fb: "diagnose", wellness: "diagnose",
  outdoor: "diagnose",     fashion:   "diagnose", ip_content: "diagnose",
  beauty:  "diagnose",
};

const STATIC_DETAIL: Record<CatId, {
  desc: string; fit: number; bars: number[]; labels: string[];
  tags: string[]; cta: string;
}> = {
  performance: {
    desc: "라이콘 오디션(2024) 이 공간 실증. 공연·굿즈 복합 운영으로 체류시간이 길다. B동 무대 구조와 궁합이 좋다.",
    fit: 5, bars: [20, 30, 42, 55, 65, 75, 80], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["★ 현장 실증", "공연·이벤트", "B동 최적"], cta: "Diagnose에서 공연·굿즈 후보 보기",
  },
  bakery_fb: {
    desc: "빵력장터(2026.05) 이 공간 최대 성공 카테고리. 이벤트 형태 F&B는 별도 영업신고 없이 운영 가능. 서북권 커뮤니티와 결합력이 가장 높다.",
    fit: 5, bars: [30, 45, 58, 72, 80, 88, 95], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["★ 현장 실증", "이벤트 우선", "영업신고 불필요(이벤트)"], cta: "Diagnose에서 F&B 후보 보기",
  },
  wellness: {
    desc: "MOVFLEX 1유로프로젝트 팝업(2024.12) 이 공간 실증. 인스타 인증샷 유발 지수가 높고 D2C 비율이 높다. 서북권 확장 원하는 웰니스 브랜드 집중.",
    fit: 5, bars: [20, 32, 45, 60, 74, 88, 91], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["★ 현장 실증", "D2C 직판", "팔로워 5천~1.5만"], cta: "Diagnose에서 웰니스 후보 보기",
  },
  outdoor: {
    desc: "캠핑·아웃도어 브랜드 실제 문의 들어옴. 루프탑·340평 오픈 구조가 팝업·체험 행사에 최적. 인바운드 검증 카테고리.",
    fit: 4, bars: [10, 15, 20, 28, 35, 42, 48], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["⚡ 인바운드 검증", "루프탑 최적", "실제 문의"], cta: "Diagnose에서 아웃도어 후보 보기",
  },
  fashion: {
    desc: "서울 팝업 시장 26% 점유. 이 공간 미검증 — 파일럿 검증 대상. A·C동 복합 배치 시 체류시간 증가 가능성 있다.",
    fit: 3, bars: [15, 18, 22, 28, 35, 40, 42], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["☆ 시장 가설", "파일럿 검증 필요", "서울 점유 26%"], cta: "Diagnose에서 패션 후보 보기",
  },
  ip_content: {
    desc: "서울 팝업 시장 17% 점유. IP·콘텐츠 팬덤 기반 굿즈 팝업 수요 증가 중. 이 공간 미검증 — 파일럿 필요.",
    fit: 3, bars: [10, 14, 18, 22, 28, 33, 36], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["☆ 시장 가설", "팬덤 기반", "서울 점유 17%"], cta: "Diagnose에서 IP·콘텐츠 후보 보기",
  },
  beauty: {
    desc: "뷰티·스킨케어 팝업 시장 수요 지속 성장. 이 공간 미검증 — 파일럿 검증 대상. 체험형 운영 시 집객력 높다.",
    fit: 3, bars: [12, 16, 20, 26, 32, 38, 40], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    tags: ["☆ 시장 가설", "체험형 강점", "파일럿 검증 필요"], cta: "Diagnose에서 뷰티 후보 보기",
  },
};

// 후보 발굴 카드 (7장 — 실증 3 + 파일럿 대기 4)
const DISCOVER_CARDS = [
  { idx: "01", name: "봄날엔",      handle: "@bom_nalen",        catId: "wellness",    catEn: "WELLNESS",  catKo: "웰니스",        note: "MOVFLEX 연계 공간 이력", verified: true,  fieldColor: "#dfe5da" },
  { idx: "02", name: "MOVFLEX",     handle: "@movflex_official",  catId: "wellness",    catEn: "WELLNESS",  catKo: "웰니스",        note: "이 공간 실증 (2024.12)", verified: true,  fieldColor: "#dbe3ea" },
  { idx: "03", name: "빵력장터",     handle: "@bbang_market",      catId: "bakery_fb",   catEn: "BAKERY",    catKo: "F&B·베이커리",  note: "이 공간 실증 (2026.05)", verified: true,  fieldColor: "#e9e1d4" },
  { idx: "04", name: "공연·굿즈 후보", handle: "",                catId: "performance", catEn: "PERFORM",   catKo: "공연·굿즈",     note: "라이콘 오디션 이력 연계", verified: false, fieldColor: "#dbe3ea" },
  { idx: "05", name: "아웃도어 후보", handle: "",                  catId: "outdoor",     catEn: "OUTDOOR",   catKo: "캠핑·아웃도어", note: "인바운드 문의 — 분석 중", verified: false, fieldColor: "#e3e3e5" },
  { idx: "06", name: "발굴 예정",    handle: "",                   catId: "fashion",     catEn: "FASHION",   catKo: "패션",          note: "파일럿 발굴 대기",        verified: false, fieldColor: "#dfe5da" },
  { idx: "07", name: "발굴 예정",    handle: "",                   catId: "ip_content",  catEn: "IP",        catKo: "IP·콘텐츠",     note: "파일럿 발굴 대기",        verified: false, fieldColor: "#e9e1d4" },
];

const FOLLOWER_OPTIONS = [
  { id: "1k-5k",    label: "1천~5천" },
  { id: "5k-20k",   label: "5천~2만 ★" },
  { id: "20k-100k", label: "2만~10만" },
];
const POPUP_OPTIONS = [
  { id: "none", label: "없음" },
  { id: "1-3",  label: "1~3회 ★" },
  { id: "3+",   label: "3회 이상" },
];
const REGION_OPTIONS = [
  { id: "서북권",    label: "서북권 밀착" },
  { id: "서울 전체", label: "서울 전체" },
  { id: "전국",      label: "전국" },
];

interface LiveCatData { description: string; tags: string[]; matchRate: number; why: string; risk: string; }
interface DorkQuery { query: string; desc: string; tip: string; }

interface Props {
  onSelectCategory: (cat: { id: string; label: string; matchRate: number | null }) => void;
  onNavigate: (tabId: string, updates?: Record<string, unknown>) => void;
  onSuggestBrand?: (brand: { name: string; instagram_handle: string; category: string; reason: string }) => void;
  initialCategory?: string;
}

function MiniBarChart({ bars, labels }: { bars: number[]; labels: string[] }) {
  const W = 340, H = 70, PX = 6, PY = 8;
  const max = Math.max(...bars, 1);
  const pts = bars.map((v, i) => {
    const x = PX + (i / Math.max(bars.length - 1, 1)) * (W - PX * 2);
    const y = PY + (1 - v / max) * (H - PY * 2);
    return [x, y] as [number, number];
  });
  const poly = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pts[0][0]},${H - PY} ${poly} ${pts[pts.length - 1][0]},${H - PY}`;
  const peakIdx = bars.indexOf(Math.max(...bars));
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 70 }}>
        <defs>
          <linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111111" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#111111" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v} x1={PX} x2={W - PX}
            y1={PY + (1 - v) * (H - PY * 2)} y2={PY + (1 - v) * (H - PY * 2)}
            stroke="#f0f1f3" strokeWidth="1" />
        ))}
        <polygon points={area} fill="url(#dg1)" />
        <polyline points={poly} fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r="3.5" fill="#1d3ab8" stroke="white" strokeWidth="1.5" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#111111" stroke="white" strokeWidth="1.5" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "2px", paddingLeft: "4px", paddingRight: "4px", color: "#b0b5bc", fontFamily: FONT_BODY }}>
        {[0, Math.floor((bars.length - 1) / 2), bars.length - 1].map(i => (
          <span key={i}>{labels[i]}</span>
        ))}
      </div>
    </div>
  );
}

function StarFit({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: "14px", color: i <= n ? "#fbbf24" : "#e5e7eb" }}>★</span>
      ))}
      <span style={{ fontSize: "11px", color: COLOR_SUB, marginLeft: "4px", fontFamily: FONT_BODY }}>이 공간 기준 적합도</span>
    </div>
  );
}

export default function DiscoverTab({ onSelectCategory, onNavigate, initialCategory }: Props) {
  const [selected,    setSelected]    = useState<CatId>((initialCategory as CatId) || "wellness");
  const [isLive,      setIsLive]      = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveData,    setLiveData]    = useState<Record<string, LiveCatData>>({});

  const [dorkCat,       setDorkCat]       = useState("wellness");
  const [dorkOpType,    setDorkOpType]    = useState<OpTypeId>("all");
  const [dorkFollowers, setDorkFollowers] = useState("5k-20k");
  const [dorkPopup,     setDorkPopup]     = useState("1-3");
  const [dorkRegion,    setDorkRegion]    = useState("서북권");
  const [dorking,       setDorking]       = useState(false);
  const [dorkQueries,   setDorkQueries]   = useState<DorkQuery[]>([]);
  const [dorkError,     setDorkError]     = useState("");

  // ── Gate A 상태
  const [pipelineUrls,    setPipelineUrls]    = useState("");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult,  setPipelineResult]  = useState<{ saved: number; dead: number } | null>(null);
  const [draftBrands,     setDraftBrands]     = useState<{ id: string; name: string; category: string; dong: string; gemini_reason: string; url: string }[]>([]);
  const [confirmingId,    setConfirmingId]    = useState<string | null>(null);
  const [gateALoaded,     setGateALoaded]     = useState(false);

  const overlineStyle: React.CSSProperties = {
    fontSize: TEXT_CAPTION_SIZE, fontWeight: 500,
    textTransform: "uppercase", letterSpacing: TRACKING_OVERLINE,
    color: "#9ca3af", fontFamily: FONT_BODY, margin: 0,
  };

  // ── Gate A 핸들러
  const loadDraftBrands = async () => {
    try {
      const res  = await fetch("/api/mezzanine/brands?status=ai_draft&analyzed=true");
      const data = await res.json() as { brands: { id: string; name: string; category: string; dong: string; gemini_reason: string; url: string }[] };
      // F&B는 헤드라이너 전용 — 발굴 타깃에서 제외
      const filtered = (Array.isArray(data.brands) ? data.brands : [])
        .filter(b => b.category !== "bakery_fb");
      setDraftBrands(filtered);
      setGateALoaded(true);
    } catch { setGateALoaded(true); }
  };

  const handleRunPipeline = async () => {
    const urls = pipelineUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (!urls.length || pipelineRunning) return;
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const res  = await fetch("/api/mezzanine/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, category: dorkCat, zone: "settle_a_upper" }),
      });
      const data = await res.json() as { saved: number; dead: number };
      setPipelineResult({ saved: data.saved ?? 0, dead: data.dead ?? 0 });
      await loadDraftBrands();
    } catch { /* 네트워크 오류 무시 */ }
    setPipelineRunning(false);
  };

  const handleGateA = async (brandId: string) => {
    if (confirmingId) return;
    setConfirmingId(brandId);
    try {
      await fetch("/api/mezzanine/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: brandId, status: "MANUAL_VERIFIED" }),
      });
      setDraftBrands(prev => prev.filter(b => b.id !== brandId));
      onNavigate("diagnose");
    } catch { /* 실패 시 목록 유지 */ }
    setConfirmingId(null);
  };

  const handleSelectCat = (catId: CatId) => {
    setSelected(catId);
    const cat = CATS.find(c => c.id === catId)!;
    onSelectCategory({ id: catId, label: cat.label, matchRate: liveData[catId]?.matchRate ?? null });
  };

  const fetchLiveDiscover = async () => {
    if (liveLoading) return;
    setLiveLoading(true);
    try {
      const res = await fetch("/api/mezzanine/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: CATS.map(c => ({ id: c.id, label: c.label })) }),
      });
      if (!res.ok) throw new Error("API 실패");
      const json = await res.json();
      setLiveData(json.data);
      setIsLive(true);
      const top = Object.entries(json.data as Record<string, LiveCatData>)
        .sort((a, b) => b[1].matchRate - a[1].matchRate)[0];
      if (top) {
        const topId = top[0] as CatId;
        setSelected(topId);
        const cat = CATS.find(c => c.id === topId)!;
        onSelectCategory({ id: topId, label: cat.label, matchRate: top[1].matchRate });
      }
    } catch {
      setLiveData({}); setIsLive(false);
    } finally {
      setLiveLoading(false);
    }
  };

  const handleDork = async () => {
    if (dorking) return;
    setDorking(true);
    setDorkError("");
    setDorkQueries([]);
    try {
      const res = await fetch("/api/mezzanine/discover/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: dorkCat, op_type: dorkOpType,
          followers_range: dorkFollowers, popup_history: dorkPopup, region: dorkRegion,
        }),
      });
      let json: { queries?: DorkQuery[]; error?: string; error_type?: string } = {};
      try { json = await res.json(); } catch { /* JSON 파싱 실패 */ }
      if (!res.ok || json.error_type) {
        const isRateLimit = res.status === 429 || json.error_type === "rate_limit";
        setDorkError(isRateLimit
          ? "AI 검색식 생성이 잠시 바쁩니다. 30~60초 후 다시 시도해 주세요."
          : "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } else if (json.queries?.length) {
        setDorkQueries(json.queries);
      } else {
        setDorkError("검색식을 생성하지 못했습니다. 카테고리를 바꿔서 다시 시도하세요.");
      }
    } catch {
      setDorkError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setDorking(false);
  };

  const handleCTA = () => {
    const cat = CATS.find(c => c.id === selected)!;
    onSelectCategory({ id: selected, label: cat.label, matchRate: liveData[selected]?.matchRate ?? null });
    onNavigate(CTA_TARGET[selected]);
  };

  // 칩 버튼 — 무채색 (인디고 X)
  const chipBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      padding: "5px 10px", borderRadius: "6px",
      border: `1px solid ${active ? COLOR_INK : "rgba(17,17,17,0.2)"}`,
      background: active ? COLOR_INK : "rgba(17,17,17,0.06)",
      color: active ? "#fff" : COLOR_INK,
      fontSize: "11px", fontWeight: active ? 600 : 400,
      cursor: "pointer", fontFamily: FONT_BODY, whiteSpace: "nowrap" as const,
    }}>{label}</button>
  );

  const staticDetail = STATIC_DETAIL[selected];
  const live         = liveData[selected];
  const displayDesc  = live?.description ?? staticDetail.desc;
  const displayTags  = live?.tags ?? staticDetail.tags;
  const displayFit   = live ? Math.min(5, Math.max(1, Math.round(live.matchRate / 20))) : staticDetail.fit;
  const selectedCat  = CATS.find(c => c.id === selected)!;

  return (
    <div style={{ width: "100%", fontFamily: FONT_BODY, overflowX: "hidden" }}>

      {/* ── 헤더 ── */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ ...overlineStyle, marginBottom: "8px" }}>DISCOVER</p>
        <h1 style={{
          fontSize: "clamp(22px, 2vw, 28px)", fontWeight: 700, color: COLOR_INK,
          fontFamily: FONT_SERIF, letterSpacing: "-0.02em",
          lineHeight: 1.1, margin: "0 0 4px 0",
        }}>
          Where Brands Belong.
        </h1>
        <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1, marginBottom: "8px" }}>
          브랜드가 어울리는 곳.
        </p>
        <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1.75, margin: 0 }}>
          검색식으로 발굴하고, 카테고리 적합도로 판단한다.
        </p>
      </div>

      <DemoBadge note="예시 데이터 — 파일럿 후 실데이터로 자동 교체" />

      <div style={{ height: "1px", background: COLOR_RULE, margin: "20px 0 24px" }} />

      {/* ── 2-col 블록: FIND / ANALYSIS (풀블리드) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", margin: "0 -24px" }}>

        {/* ── Left: FIND — 블록 전체 세이지 #dfe5da ── */}
        <div style={{ background: "#dfe5da", padding: "44px 40px 52px 24px" }}>
          <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "8px" }}>FIND</p>
          <h2 style={{
            fontSize: "clamp(20px, 2vw, 28px)", fontWeight: 700, color: COLOR_INK,
            fontFamily: FONT_SERIF, letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0 0 5px 0",
          }}>
            Search the Market.
          </h2>
          <p style={{ fontSize: "12px", color: "rgba(17,17,17,0.55)", fontFamily: FONT_BODY, lineHeight: 1, margin: "0 0 10px 0" }}>
            검색식으로 발굴한다.
          </p>
          <p style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", fontFamily: FONT_BODY, lineHeight: 1.65, margin: "0 0 24px 0" }}>
            AI가 <strong>브랜드명을 생성하지 않습니다.</strong> 구글 검색식(dorking)만 만들고, 구글이 실존 인스타 URL을 반환합니다.
          </p>

          {/* 검색 조건 — 5개 필드 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            <div>
              <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "6px", fontSize: "11px" }}>카테고리</p>
              <select value={dorkCat} onChange={e => setDorkCat(e.target.value)}
                style={{
                  width: "100%", fontSize: "12px", padding: "8px 10px", borderRadius: "6px",
                  border: "1px solid rgba(17,17,17,0.2)", background: "rgba(255,255,255,0.7)",
                  outline: "none", fontFamily: FONT_BODY, color: COLOR_INK,
                }}>
                {CATS.filter(c => !c.headliner_only).map(c => <option key={c.id} value={c.id}>{c.tag} {c.label}</option>)}
              </select>
            </div>
            <div>
              <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "6px", fontSize: "11px" }}>운영 형태</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                {OP_TYPES.map(o => chipBtn(o.label, dorkOpType === o.id, () => setDorkOpType(o.id)))}
              </div>
            </div>
            <div>
              <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "6px", fontSize: "11px" }}>팔로워</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                {FOLLOWER_OPTIONS.map(f => chipBtn(f.label, dorkFollowers === f.id, () => setDorkFollowers(f.id)))}
              </div>
            </div>
            <div>
              <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "6px", fontSize: "11px" }}>팝업이력</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                {POPUP_OPTIONS.map(p => chipBtn(p.label, dorkPopup === p.id, () => setDorkPopup(p.id)))}
              </div>
            </div>
            <div>
              <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "6px", fontSize: "11px" }}>지역</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                {REGION_OPTIONS.map(r => chipBtn(r.label, dorkRegion === r.id, () => setDorkRegion(r.id)))}
              </div>
            </div>
          </div>
          {/* 검색식 생성 버튼 — 무채색 #111 */}
          <button onClick={handleDork} disabled={dorking} style={{
            width: "100%", padding: "12px", borderRadius: "7px",
            background: dorking ? "rgba(17,17,17,0.3)" : COLOR_INK,
            color: "#fff", border: "none", fontSize: "13px", fontWeight: 700,
            cursor: dorking ? "not-allowed" : "pointer", fontFamily: FONT_BODY,
          }}>
            {dorking ? "검색식 생성 중..." : "구글 검색식 생성하기 →"}
          </button>
        </div>

        {/* ── Right: ANALYSIS — 블록 전체 #fafaf8 ── */}
        <div style={{ background: "#fafaf8", padding: "44px 24px 52px 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <p style={{ ...overlineStyle, marginBottom: "8px" }}>ANALYSIS</p>
            <h2 style={{
              fontSize: "clamp(17px, 1.6vw, 20px)", fontWeight: 700, color: COLOR_INK,
              fontFamily: FONT_SERIF, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 4px 0",
            }}>
              Category Fit.
            </h2>
            <p style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1, margin: 0 }}>
              카테고리 적합도.
            </p>
          </div>

          {/* 카테고리 선택 */}
          <select value={selected} onChange={e => handleSelectCat(e.target.value as CatId)}
            style={{
              width: "100%", fontSize: "12px", padding: "8px 10px", borderRadius: "6px",
              border: `1px solid ${COLOR_RULE}`, background: "#f0f0ee",
              outline: "none", fontFamily: FONT_BODY, color: COLOR_INK,
            }}>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.tag} {c.label}</option>)}
          </select>

          {/* POP-UP INTEREST 차트 */}
          <div>
            <p style={{ ...overlineStyle, marginBottom: "8px" }}>POP-UP INTEREST</p>
            <MiniBarChart bars={staticDetail.bars} labels={staticDetail.labels} />
          </div>

          {/* StarFit */}
          <StarFit n={displayFit} />

          {/* 설명 */}
          <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1.65, margin: 0, flex: 1 }}>
            {displayDesc}
          </p>

          {/* 태그 */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            {displayTags.map((t, i) => (
              <span key={i} style={{
                fontSize: "11px", fontWeight: 500, padding: "4px 10px", borderRadius: "5px",
                background: "#ebebea", border: `1px solid ${COLOR_RULE}`, color: COLOR_INK,
                fontFamily: FONT_BODY,
              }}>{t}</span>
            ))}
          </div>

          {/* Live Discover 버튼 — 불가침 (COLOR_ACCENT 인디고) */}
          {isLive ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                fontSize: "10px", color: COLOR_INK, fontWeight: 600,
                padding: "5px 8px", borderRadius: "5px",
                border: `1px solid ${COLOR_RULE}`, background: "#ebebea",
                fontFamily: FONT_BODY,
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLOR_INK, display: "inline-block" }} />
                라이브 실행 중
              </div>
              <button onClick={fetchLiveDiscover} disabled={liveLoading} style={{
                width: "100%", padding: "8px", background: "#f5f5f3", border: `1px solid ${COLOR_INK}`,
                borderRadius: "5px", fontSize: "11px", color: liveLoading ? "#9ca3af" : COLOR_INK,
                fontWeight: 600, cursor: liveLoading ? "not-allowed" : "pointer", fontFamily: FONT_BODY,
              }}>
                {liveLoading ? "분석 중..." : "↺ 다시 돌리기"}
              </button>
            </div>
          ) : (
            <button onClick={fetchLiveDiscover} disabled={liveLoading} style={{
              width: "100%", padding: "10px", background: liveLoading ? "#f0f1f3" : COLOR_ACCENT,
              border: "none", borderRadius: "6px", fontSize: "12px",
              color: liveLoading ? "#9ca3af" : "#fff",
              fontWeight: 600, cursor: liveLoading ? "not-allowed" : "pointer", fontFamily: FONT_BODY,
            }}>
              {liveLoading ? "⏳ 분석 중..." : "▶ 라이브 Discover 실행"}
            </button>
          )}

          {/* Diagnose CTA */}
          <div onClick={handleCTA}
            style={{
              background: "#ebebea", borderRadius: "7px", border: `1px solid ${COLOR_RULE}`,
              padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e0e0de")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ebebea")}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: COLOR_INK, fontFamily: FONT_BODY }}>
              → {selectedCat.label} Diagnose에서 보기
            </span>
            <span style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, flexShrink: 0 }}>탭 전환 →</span>
          </div>
        </div>
      </div>

      {/* ── 검색식 결과 (전폭, 조건부) ── */}
      {dorkError && (
        <div style={{
          marginBottom: "20px", padding: "10px 14px", borderRadius: "7px",
          background: "#fef2f2", border: "1px solid #fca5a5",
          fontSize: "12px", color: "#dc2626", fontFamily: FONT_BODY,
        }}>
          {dorkError}
        </div>
      )}

      {dorkQueries.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <p style={{ ...overlineStyle, marginBottom: 0 }}>SEARCH RESULTS</p>
            <span style={{
              fontSize: "11px", fontWeight: 600, color: "#15803d",
              background: "#dcfce7", border: "1px solid #86efac",
              padding: "2px 8px", borderRadius: "4px", fontFamily: FONT_BODY,
            }}>
              {dorkQueries.length}개 검색식
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dorkQueries.map((q, i) => (
              <div key={i} style={{
                background: "#fff", border: `1px solid ${COLOR_RULE}`,
                borderRadius: "10px", padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <code style={{
                      display: "block", fontSize: "12px", fontFamily: "monospace",
                      background: "#f0fdf4", border: "1px solid #bbf7d0",
                      borderRadius: "6px", padding: "8px 12px",
                      color: "#166534", lineHeight: 1.6, marginBottom: "8px",
                      wordBreak: "break-all" as const,
                    }}>
                      {q.query}
                    </code>
                    <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 4px 0", lineHeight: 1.5, fontFamily: FONT_BODY }}>{q.desc}</p>
                    {q.tip && <p style={{ fontSize: "11px", color: COLOR_SUB, margin: 0, lineHeight: 1.4, fontFamily: FONT_BODY }}>💡 {q.tip}</p>}
                  </div>
                  {/* 구글에서 열기 버튼 — 무채색 #111 */}
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(q.query)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      fontSize: "12px", fontWeight: 700, padding: "8px 14px",
                      borderRadius: "7px", border: "none",
                      background: COLOR_INK, color: "#fff",
                      textDecoration: "none", fontFamily: FONT_BODY,
                      whiteSpace: "nowrap" as const, flexShrink: 0,
                      display: "inline-flex", alignItems: "center", gap: "4px",
                    }}>
                    구글에서 열기 ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px", lineHeight: 1.55, fontFamily: FONT_BODY }}>
            구글 결과에서 팔로워 수(스니펫)로 1차 필터 → 인스타 클릭 실존 확인 → Setup 탭에서 직접 등록
          </p>
        </div>
      )}

      {/* ── PIPELINE: URL 입력 → settle_a_upper 실행 ── */}
      {dorkQueries.length > 0 && (
        <div style={{
          margin: "0 0 28px 0", padding: "24px", borderRadius: "10px",
          background: "#f8f7f5", border: `1px solid ${COLOR_RULE}`,
        }}>
          <p style={{ ...overlineStyle, marginBottom: "8px" }}>SETTLE A UPPER · PIPELINE</p>
          <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1.6, margin: "0 0 14px 0" }}>
            구글에서 찾은 브랜드 URL을 한 줄씩 붙여넣기 → 생존 필터(HTTP 200) → AI 분석 → Gate A 대기열에 추가
          </p>
          <textarea
            value={pipelineUrls}
            onChange={e => setPipelineUrls(e.target.value)}
            placeholder={"https://www.instagram.com/brand_a\nhttps://www.instagram.com/brand_b"}
            rows={4}
            style={{
              width: "100%", fontSize: "12px", padding: "10px 12px", borderRadius: "7px",
              border: `1px solid ${COLOR_RULE}`, fontFamily: "monospace",
              resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const,
              color: COLOR_INK, background: "#fff",
            }}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
            <button onClick={handleRunPipeline} disabled={pipelineRunning || !pipelineUrls.trim()}
              style={{
                padding: "10px 20px", borderRadius: "7px", border: "none",
                background: (pipelineRunning || !pipelineUrls.trim()) ? "#e5e7eb" : COLOR_INK,
                color: (pipelineRunning || !pipelineUrls.trim()) ? "#9ca3af" : "#fff",
                fontSize: "12px", fontWeight: 700, cursor: (pipelineRunning || !pipelineUrls.trim()) ? "not-allowed" : "pointer",
                fontFamily: FONT_BODY,
              }}>
              {pipelineRunning ? "파이프라인 실행 중…" : "파이프라인 실행 →"}
            </button>
            {pipelineResult && (
              <span style={{ fontSize: "12px", color: "#374151", fontFamily: FONT_BODY }}>
                저장 <strong>{pipelineResult.saved}</strong>건 · 탈락(죽은 링크) {pipelineResult.dead}건
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── GATE A: AI 발굴 대기 브랜드 목록 ── */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <p style={{ ...overlineStyle, marginBottom: 0 }}>GATE A · 사람 확정 대기</p>
          {!gateALoaded && (
            <button onClick={loadDraftBrands}
              style={{
                fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "5px",
                border: `1px solid ${COLOR_RULE}`, background: "#fff", color: COLOR_INK,
                cursor: "pointer", fontFamily: FONT_BODY,
              }}>
              목록 불러오기
            </button>
          )}
          {gateALoaded && (
            <span style={{
              fontSize: "11px", fontWeight: 600, color: draftBrands.length > 0 ? "#92400e" : "#15803d",
              background: draftBrands.length > 0 ? "#fef3c7" : "#dcfce7",
              border: `1px solid ${draftBrands.length > 0 ? "#fde68a" : "#86efac"}`,
              padding: "2px 8px", borderRadius: "4px", fontFamily: FONT_BODY,
            }}>
              {draftBrands.length > 0 ? `${draftBrands.length}건 대기` : "대기 없음"}
            </span>
          )}
        </div>

        {gateALoaded && draftBrands.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {draftBrands.map(brand => (
              <div key={brand.id} style={{
                background: "#fff", border: `1px solid ${COLOR_RULE}`,
                borderRadius: "10px", padding: "16px 18px",
                display: "flex", gap: "16px", alignItems: "flex-start",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
                      background: "#fef9c3", border: "1px solid #fde047", color: "#713f12",
                      fontFamily: FONT_BODY,
                    }}>
                      AI 발굴 · 익명
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "4px",
                      background: "#f3f4f6", border: `1px solid ${COLOR_RULE}`, color: COLOR_INK,
                      fontFamily: FONT_BODY,
                    }}>
                      {brand.category} · {brand.dong !== "TBD" ? `${brand.dong}동 추천` : "동 미정"}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: COLOR_INK, fontFamily: FONT_BODY, margin: "0 0 4px 0" }}>
                    {brand.name}
                  </p>
                  {brand.gemini_reason && (
                    <p style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY, margin: "0 0 4px 0", lineHeight: 1.5 }}>
                      {brand.gemini_reason}
                    </p>
                  )}
                  {brand.url && (
                    <a href={brand.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "11px", color: "#3b82f6", fontFamily: FONT_BODY, wordBreak: "break-all" as const }}>
                      {brand.url}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleGateA(brand.id)}
                  disabled={confirmingId === brand.id}
                  style={{
                    padding: "10px 16px", borderRadius: "7px", border: "none",
                    background: confirmingId === brand.id ? "#e5e7eb" : COLOR_INK,
                    color: confirmingId === brand.id ? "#9ca3af" : "#fff",
                    fontSize: "12px", fontWeight: 700, cursor: confirmingId === brand.id ? "not-allowed" : "pointer",
                    fontFamily: FONT_BODY, flexShrink: 0, whiteSpace: "nowrap" as const,
                  }}>
                  {confirmingId === brand.id ? "확정 중…" : "Gate A 확정 →"}
                </button>
              </div>
            ))}
          </div>
        )}

        {gateALoaded && draftBrands.length === 0 && (
          <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY }}>
            파이프라인 실행 후 AI 분석 완료 브랜드가 여기 표시됩니다.
          </p>
        )}
        <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: "8px 0 0 0" }}>
          F&B·베이커리는 헤드라이너 전용(집객 앵커) — 발굴 타깃 제외. Diagnose 캘린더에서 앵커로 배치됩니다.
        </p>
      </div>

      {/* ── 검정 밴드 (풀블리드) ── */}
      <div style={{ height: "1px", background: COLOR_RULE, margin: "0 -24px" }} />
      <div style={{ background: COLOR_INK, margin: "0 -24px", padding: "56px 24px" }}>
        <p style={{
          fontSize: "10px", fontWeight: 500, textTransform: "uppercase" as const,
          letterSpacing: TRACKING_OVERLINE, color: "rgba(255,255,255,0.4)",
          fontFamily: FONT_BODY, margin: "0 0 16px 0",
        }}>
          WHY THIS WORKS
        </p>
        <h2 style={{
          fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 700,
          color: "#fff", lineHeight: 1.05, letterSpacing: "-0.02em",
          margin: "0 0 24px 0", maxWidth: "640px",
        }}>
          "발굴이 전략이다."
        </h2>
        <div style={{ width: "40px", height: "1px", background: "#fff", margin: "0 0 20px 0" }} />
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", fontFamily: FONT_BODY, lineHeight: 1.7, margin: "0 0 20px 0", maxWidth: "480px" }}>
          브랜드를 기다리지 않는다. 검색식으로 찾고, 데이터로 판단한다.
        </p>
        <span style={{
          fontSize: "12px", color: "rgba(255,255,255,0.6)", fontFamily: FONT_BODY,
          textDecoration: "underline", cursor: "pointer", letterSpacing: "0.02em",
        }}>
          후보 보기 →
        </span>
      </div>
      <div style={{ height: "1px", background: COLOR_RULE, margin: "0 -24px" }} />

      {/* ── 후보 발굴 카드 그리드 (항상 노출) ── */}
      <div style={{ paddingTop: "36px" }} />
      <p style={{ ...overlineStyle, marginBottom: "16px" }}>CANDIDATE</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {DISCOVER_CARDS.map(card => (
          <div
            key={card.idx}
            onClick={() => handleSelectCat(card.catId as CatId)}
            style={{
              border: `1px solid ${selected === card.catId ? COLOR_INK : COLOR_RULE}`,
              borderRadius: "10px", overflow: "hidden", cursor: "pointer",
              transition: "border-color 0.12s",
            }}
          >
            {/* 컬러필드 */}
            <div style={{
              height: "100px",
              background: card.fieldColor,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", left: "16px", bottom: "12px" }}>
                <p style={{
                  fontSize: TEXT_CAPTION_SIZE, fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: TRACKING_OVERLINE,
                  color: "rgba(17,17,17,0.38)", fontFamily: FONT_BODY,
                  margin: "0 0 3px 0",
                }}>
                  FIND · {card.idx}
                </p>
                <p style={{
                  fontFamily: FONT_SERIF,
                  fontSize: "clamp(20px, 2vw, 28px)",
                  fontWeight: 700, color: COLOR_INK,
                  lineHeight: 1, margin: 0,
                  letterSpacing: "-0.02em",
                }}>
                  {card.catEn}
                </p>
              </div>
              {card.verified && (
                <span style={{
                  position: "absolute", top: "10px", right: "12px",
                  fontSize: "9px", fontWeight: 700, color: "#15803d",
                  background: "#dcfce7", border: "1px solid #86efac",
                  padding: "2px 7px", borderRadius: "4px", fontFamily: FONT_BODY,
                }}>
                  실증
                </span>
              )}
            </div>

            {/* 텍스트 영역 */}
            <div style={{ padding: "14px 16px 18px", background: "#fff" }}>
              <p style={{
                fontSize: "13px", fontWeight: card.verified ? 700 : 500,
                color: COLOR_INK, fontFamily: FONT_BODY,
                margin: "0 0 3px 0", lineHeight: 1.2,
              }}>
                {card.name}
              </p>
              {card.handle && (
                <p style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY, margin: "0 0 6px 0" }}>
                  {card.handle}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" as const, marginBottom: "6px" }}>
                <span style={{
                  fontSize: "10px", fontWeight: 600, color: COLOR_INK,
                  background: "#f3f4f6", border: `1px solid ${COLOR_RULE}`,
                  padding: "2px 7px", borderRadius: "4px", fontFamily: FONT_BODY,
                }}>
                  {card.catKo}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.4 }}>
                {card.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
