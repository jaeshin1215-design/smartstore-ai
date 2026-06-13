"use client";

import { useState, useEffect } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import {
  FONT_SERIF, FONT_BODY,
  COLOR_INK, COLOR_SUB, COLOR_RULE, COLOR_ACCENT,
  TEXT_CAPTION_SIZE, TRACKING_OVERLINE,
} from "@/lib/tokens";

const CATS = [
  { id: "performance", label: "공연·굿즈",   catEn: "PERFORM",  tag: "★", verified: true,  comment: "라이콘 실증",    headliner_only: false },
  { id: "bakery_fb",   label: "F&B·베이커리", catEn: "BAKERY",   tag: "★", verified: true,  comment: "빵력장터 실증",  headliner_only: false },
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

const DISCOVER_CARDS = [
  { idx: "01", name: "봄날엔",      handle: "@bom_nalen",        catId: "wellness",    catEn: "WELLNESS",  catKo: "웰니스",        note: "MOVFLEX 연계 공간 이력", verified: true,  fieldColor: "#dfe5da" },
  { idx: "02", name: "MOVFLEX",     handle: "@movflex_official",  catId: "wellness",    catEn: "WELLNESS",  catKo: "웰니스",        note: "이 공간 실증 (2024.12)", verified: true,  fieldColor: "#dbe3ea" },
  { idx: "03", name: "빵력장터",     handle: "@bbang_market",      catId: "bakery_fb",   catEn: "BAKERY",    catKo: "F&B·베이커리",  note: "이 공간 실증 (2026.05)", verified: true,  fieldColor: "#e9e1d4" },
  { idx: "04", name: "공연·굿즈 후보", handle: "",                catId: "performance", catEn: "PERFORM",   catKo: "공연·굿즈",     note: "라이콘 오디션 이력 연계", verified: false, fieldColor: "#dbe3ea" },
  { idx: "05", name: "아웃도어 후보", handle: "",                  catId: "outdoor",     catEn: "OUTDOOR",   catKo: "캠핑·아웃도어", note: "인바운드 문의 — 분석 중", verified: false, fieldColor: "#e3e3e5" },
  { idx: "06", name: "발굴 예정",    handle: "",                   catId: "fashion",     catEn: "FASHION",   catKo: "패션",          note: "파일럿 발굴 대기",        verified: false, fieldColor: "#dfe5da" },
  { idx: "07", name: "발굴 예정",    handle: "",                   catId: "ip_content",  catEn: "IP",        catKo: "IP·콘텐츠",     note: "파일럿 발굴 대기",        verified: false, fieldColor: "#e9e1d4" },
];

// ── Harness 매칭 타입
interface HarnessCandidateScores {
  followers: number;
  result_fit: number;
  d2c_small: number;
  no_fb: number;
  popup_signal: number;
  anchor_fit: number;
}

interface HarnessCandidate {
  name: string;
  handle: string;
  url: string;
  snippet: string;
  source_query: string;
  scores: HarnessCandidateScores;
  total_score: number;
  fable_reason: string;
  human_checks: string[];
}

interface HarnessResult {
  mode: string;
  category?: string;
  candidates: HarnessCandidate[];
  total: number;
  scoring_max: number;
}

interface CandidateFlag {
  seobukgwon: boolean;
  userStatus: "후보" | "실선" | "탈락" | null;
}

// ── MATCH 카테고리 — FIND와 1:1 싱크를 위해 7개 전부
const MATCH_CATS = [
  { id: "wellness",    label: "웰니스 ★" },
  { id: "bakery_fb",  label: "F&B ★" },
  { id: "performance", label: "공연·굿즈" },
  { id: "outdoor",    label: "아웃도어" },
  { id: "fashion",    label: "패션" },
  { id: "ip_content", label: "IP·콘텐츠" },
  { id: "beauty",     label: "뷰티" },
];

const MATCH_SESSION_KEY = "mezzanine_harness_session";

const FOLLOWER_OPTIONS_DEFAULT = [
  { id: "1k-5k",    label: "1천~5천" },
  { id: "5k-20k",   label: "5천~2만 ★" },
  { id: "20k-100k", label: "2만~10만" },
];
const FOLLOWER_OPTIONS_FB = [
  { id: "1k-5k",    label: "1천~5천" },
  { id: "5k-50k",   label: "5천~5만 ★ F&B" },
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

  // ── MATCH 상태 (P1/P2)
  const [matchCat,       setMatchCat]       = useState("wellness");
  const [matchUrls,      setMatchUrls]      = useState("");
  const [matching,       setMatching]       = useState(false);
  const [matchError,     setMatchError]     = useState("");
  const [matchResult,    setMatchResult]    = useState<HarnessResult | null>(null);
  const [candidateFlags, setCandidateFlags] = useState<Record<string, CandidateFlag>>({});

  // ── GO-① 게이트 A 등록 상태
  const [regForms, setRegForms] = useState<Record<string, {
    name: string; followers: string; popup_count: string; season: string; open: boolean;
  }>>({});
  const [regLoading, setRegLoading] = useState<Record<string, boolean>>({});
  const [regDone,    setRegDone]    = useState<Set<string>>(new Set());

  // 마운트 시 마지막 매칭 결과 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MATCH_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const lastCat = typeof parsed._lastCat === "string" ? parsed._lastCat : "wellness";
      const candidates = Array.isArray(parsed[lastCat]) ? (parsed[lastCat] as HarnessCandidate[]) : [];
      if (candidates.length > 0) {
        setMatchCat(lastCat);
        setMatchResult({ mode: "manual_urls", candidates, total: candidates.length, scoring_max: 7 });
      }
    } catch { /* ignore */ }
  }, []);

  const overlineStyle: React.CSSProperties = {
    fontSize: TEXT_CAPTION_SIZE, fontWeight: 500,
    textTransform: "uppercase", letterSpacing: TRACKING_OVERLINE,
    color: "#9ca3af", fontFamily: FONT_BODY, margin: 0,
  };

  // ── MATCH 핸들러
  const saveMatchSession = (cat: string, candidates: HarnessCandidate[]) => {
    try {
      const existing = JSON.parse(localStorage.getItem(MATCH_SESSION_KEY) || "{}") as Record<string, unknown>;
      existing[cat] = candidates;
      existing._lastCat = cat;
      localStorage.setItem(MATCH_SESSION_KEY, JSON.stringify(existing));
    } catch { /* ignore */ }
  };

  const handleMatch = async () => {
    const urls = matchUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (!urls.length || matching) return;
    setMatching(true);
    setMatchError("");
    setMatchResult(null);
    setCandidateFlags({});
    try {
      const res = await fetch("/api/mezzanine/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: matchCat, urls }),
      });
      const data = await res.json() as HarnessResult & { error?: string; error_code?: string };
      if (!res.ok) {
        const code = data.error_code ?? "";
        const msg = code === "auth_error"  ? "API 키 인증 오류. Anthropic 콘솔 확인 필요."
                  : code === "quota_error" ? "API 크레딧 부족. console.anthropic.com 충전 필요."
                  : code === "model_error" ? "모델 오류. 잠시 후 다시 시도하세요."
                  : data.error            ? data.error.slice(0, 120)
                  : "매칭 실행 실패. 잠시 후 다시 시도하세요.";
        setMatchError(msg);
        return;
      }
      setMatchResult(data);
      saveMatchSession(matchCat, data.candidates);
    } catch {
      setMatchError("네트워크 오류. API 응답이 JSON이 아닙니다 — Vercel 로그를 확인하세요.");
    } finally {
      setMatching(false);
    }
  };

  const updateFlag = (url: string, updates: Partial<CandidateFlag>) => {
    setCandidateFlags(prev => {
      const current: CandidateFlag = prev[url] ?? { seobukgwon: false, userStatus: null };
      return { ...prev, [url]: { ...current, ...updates } };
    });
  };

  // ── GO-① 게이트 A 등록 핸들러
  const defaultSeason = (): string => {
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5)  return "spring";
    if (m >= 6 && m <= 8)  return "summer";
    if (m >= 9 && m <= 11) return "fall";
    return "winter";
  };

  const toggleRegForm = (url: string, candidateName?: string) => {
    setRegForms(prev => {
      const ex = prev[url];
      if (ex) return { ...prev, [url]: { ...ex, open: !ex.open } };
      return { ...prev, [url]: { name: candidateName ?? "", followers: "", popup_count: "", season: defaultSeason(), open: true } };
    });
  };

  const handleRegister = async (cand: HarnessCandidate) => {
    const form = regForms[cand.url];
    if (!form?.name?.trim() || regLoading[cand.url]) return;
    setRegLoading(prev => ({ ...prev, [cand.url]: true }));
    try {
      const cat = matchResult?.category ?? matchCat;
      const res = await fetch("/api/mezzanine/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             form.name.trim(),
          instagram_handle: cand.handle,
          url:              cand.url,
          category:         cat,
          followers:        Number(form.followers)   || 0,
          popup_count:      Number(form.popup_count) || 0,
          season:           form.season || "all",
          source_type:      "MANUAL",
          region:           "서북권",
        }),
      });
      if (res.ok) {
        setRegDone(prev => new Set([...prev, cand.url]));
        setRegForms(prev => ({ ...prev, [cand.url]: { ...prev[cand.url], open: false } }));
      }
    } catch { /* ignore */ }
    setRegLoading(prev => ({ ...prev, [cand.url]: false }));
  };

  // ── Gate A 핸들러
  const loadDraftBrands = async () => {
    try {
      const res  = await fetch("/api/mezzanine/brands?status=ai_draft&analyzed=true");
      const data = await res.json() as { brands: { id: string; name: string; category: string; dong: string; gemini_reason: string; url: string }[] };
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

      {/* ══ MATCH 섹션 (P1 — 주요 기능) ══ */}
      <div style={{
        margin: "0 0 28px 0", padding: "28px 32px",
        background: "#f0f4f8",
        borderRadius: "12px",
        border: "1px solid rgba(17,17,17,0.1)",
      }}>
        <div style={{ marginBottom: "20px" }}>
          <p style={{ ...overlineStyle, marginBottom: "6px" }}>MATCH · AI 매칭</p>
          <h2 style={{
            fontSize: "clamp(18px, 1.8vw, 24px)", fontWeight: 700, color: COLOR_INK,
            fontFamily: FONT_SERIF, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 4px 0",
          }}>
            Score the Candidates.
          </h2>
          <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1.65, margin: 0 }}>
            구글에서 찾은 인스타 URL을 붙여넣으면 Sonnet 4.6가 6필터로 채점합니다.
            서북권 연고·최종 결 판단은 아래 수동 플래그로 직접 입력하세요.
          </p>
        </div>

        {/* 카테고리 */}
        <div style={{ marginBottom: "16px" }}>
          <p style={{ ...overlineStyle, fontSize: "11px", color: "rgba(17,17,17,0.45)", marginBottom: "8px" }}>카테고리</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
            {MATCH_CATS.map(mc => chipBtn(mc.label, matchCat === mc.id, () => setMatchCat(mc.id)))}
          </div>
          {/* GO-②: 불일치 경고 */}
          {dorkCat !== matchCat && (
            <div style={{
              marginTop: "8px", padding: "6px 10px", borderRadius: "5px",
              background: "#fef9c3", border: "1px solid #fde047",
              fontSize: "11px", color: "#713f12", fontFamily: FONT_BODY,
            }}>
              ⚠ FIND는 <strong>{dorkCat}</strong> 기준, 채점은 <strong>{matchCat}</strong> 기준 — 불일치
            </div>
          )}
        </div>

        {/* URL textarea */}
        <div style={{ marginBottom: "16px" }}>
          <p style={{ ...overlineStyle, fontSize: "11px", color: "rgba(17,17,17,0.45)", marginBottom: "8px" }}>
            인스타 URL (한 줄에 하나씩 · 최대 30개)
          </p>
          <textarea
            value={matchUrls}
            onChange={e => setMatchUrls(e.target.value)}
            placeholder={"https://www.instagram.com/brand_a\nhttps://www.instagram.com/brand_b\nhttps://www.instagram.com/brand_c"}
            rows={5}
            style={{
              width: "100%", fontSize: "12px", padding: "10px 12px", borderRadius: "7px",
              border: "1px solid rgba(17,17,17,0.2)", fontFamily: "monospace",
              resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const,
              color: COLOR_INK, background: "#fff", lineHeight: 1.6,
            }}
          />
        </div>

        {/* 실행 버튼 */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" as const }}>
          <button onClick={handleMatch} disabled={matching || !matchUrls.trim()} style={{
            padding: "11px 24px", borderRadius: "8px", border: "none",
            background: (matching || !matchUrls.trim()) ? "#d1d5db" : COLOR_INK,
            color: (matching || !matchUrls.trim()) ? "#9ca3af" : "#fff",
            fontSize: "13px", fontWeight: 700,
            cursor: (matching || !matchUrls.trim()) ? "not-allowed" : "pointer",
            fontFamily: FONT_BODY,
          }}>
            {matching ? "⏳ Sonnet 4.6 채점 중…" : "매칭 돌리기 →"}
          </button>
          <span style={{
            fontSize: "11px", color: "rgba(17,17,17,0.45)", fontFamily: FONT_BODY,
            background: "#fff", padding: "5px 10px", borderRadius: "5px",
            border: "1px solid rgba(17,17,17,0.12)",
          }}>
            🔒 서북권·최종 결 = 사람 판단
          </span>
        </div>

        {matchError && (
          <div style={{
            marginTop: "12px", padding: "8px 14px", borderRadius: "6px",
            background: "#fef2f2", border: "1px solid #fca5a5",
            fontSize: "12px", color: "#dc2626", fontFamily: FONT_BODY,
          }}>
            {matchError}
          </div>
        )}
      </div>

      {/* ══ MATCH RESULTS (P2) ══ */}
      {matchResult && (
        <div style={{ margin: "0 0 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" as const }}>
            <p style={{ ...overlineStyle, marginBottom: 0 }}>MATCH RESULTS</p>
            {matchResult.candidates.length > 0 ? (
              <span style={{
                fontSize: "11px", fontWeight: 600, color: "#15803d",
                background: "#dcfce7", border: "1px solid #86efac",
                padding: "2px 8px", borderRadius: "4px", fontFamily: FONT_BODY,
              }}>
                {matchResult.candidates.length}건 · 최고점순
              </span>
            ) : (
              <span style={{
                fontSize: "11px", fontWeight: 600, color: "#92400e",
                background: "#fef3c7", border: "1px solid #fde68a",
                padding: "2px 8px", borderRadius: "4px", fontFamily: FONT_BODY,
              }}>
                후보 없음
              </span>
            )}
            <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>
              최대 {matchResult.scoring_max ?? 7}점
            </span>
          </div>
          {/* GO-③ 정직 라벨: 핸들명 기반 1차 추정임을 사전 고지 */}
          <div style={{
            marginBottom: "14px", padding: "7px 12px", borderRadius: "6px",
            background: "#fffbeb", border: "1px solid #fde68a",
            fontSize: "11px", color: "#92400e", fontFamily: FONT_BODY, lineHeight: 1.5,
          }}>
            🔍 <strong>AI 1차 분류</strong> — 인스타 핸들명·텍스트 기반 추정. 팔로워·실체 미확인.
            실선 후보는 아래 "게이트 A 등록"으로 사람 확인 후 DB 등록하세요.
          </div>

          {matchResult.candidates.length === 0 && (
            <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY }}>
              Sonnet 4.6가 입력 URL에서 적합 후보를 추출하지 못했습니다. URL을 다시 확인하거나 다른 계정을 투입해 보세요.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {matchResult.candidates.map((cand, idx) => {
              const flag     = candidateFlags[cand.url] ?? { seobukgwon: false, userStatus: null };
              const maxScore = matchResult.scoring_max ?? 7;
              const filled   = Math.max(0, Math.min(7, Math.round((cand.total_score / maxScore) * 7)));
              const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                "실선": { bg: "#dbeafe", color: "#1d3ab8", border: "#93c5fd" },
                "후보": { bg: "#dcfce7", color: "#059669", border: "#86efac" },
                "탈락": { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
              };

              return (
                <div key={cand.url || idx} style={{
                  background: "#fff",
                  border: `1px solid ${
                    flag.userStatus === "실선" ? "#93c5fd"
                    : flag.userStatus === "탈락" ? "#fca5a5"
                    : "rgba(17,17,17,0.12)"
                  }`,
                  borderRadius: "12px", padding: "18px 20px",
                  transition: "border-color 0.15s",
                }}>
                  {/* 상단: 브랜드명 + 점수 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: COLOR_INK, fontFamily: FONT_BODY, margin: "0 0 2px 0" }}>
                        {cand.name || "미확인"}
                        {cand.handle && (
                          <span style={{ fontWeight: 400, color: COLOR_SUB, fontSize: "12px", marginLeft: "6px" }}>
                            {cand.handle}
                          </span>
                        )}
                      </p>
                      <a
                        href={cand.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "11px", color: "#1d3ab8", fontFamily: FONT_BODY, textDecoration: "underline", wordBreak: "break-all" as const }}
                      >
                        {cand.url} ↗
                      </a>
                    </div>
                    {/* 점수 배지 */}
                    <div style={{ textAlign: "right" as const, flexShrink: 0, marginLeft: "16px" }}>
                      <span style={{ fontSize: "20px", fontWeight: 800, color: COLOR_INK, fontFamily: FONT_SERIF }}>
                        {cand.total_score}
                        <span style={{ fontSize: "13px", fontWeight: 400, color: COLOR_SUB }}>/{maxScore}</span>
                      </span>
                      <div style={{ display: "flex", gap: "3px", marginTop: "5px", justifyContent: "flex-end" as const }}>
                        {[1,2,3,4,5,6,7].map(i => (
                          <span key={i} style={{
                            width: "8px", height: "8px", borderRadius: "2px",
                            background: i <= filled ? COLOR_INK : "#e5e7eb",
                            display: "inline-block",
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6필터 내역 */}
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" as const, marginBottom: "10px" }}>
                    {([
                      { key: "result_fit",   label: "결",      max: 2, val: cand.scores.result_fit },
                      { key: "d2c_small",    label: "D2C",     max: 1, val: cand.scores.d2c_small },
                      { key: "no_fb",        label: (matchResult?.category ?? matchCat) === "bakery_fb" ? "F&B우대" : "F&B제외", max: 1, val: cand.scores.no_fb },
                      { key: "popup_signal", label: "팝업",    max: 1, val: cand.scores.popup_signal },
                      { key: "anchor_fit",   label: "앵커",    max: 2, val: cand.scores.anchor_fit },
                      { key: "followers",    label: "팔로워",  max: 1, val: cand.scores.followers },
                    ] as const).map(f => (
                      <span key={f.key} style={{
                        fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px",
                        background: f.val > 0 ? "#f0fdf4" : "#f9fafb",
                        border: `1px solid ${f.val > 0 ? "#86efac" : "#e5e7eb"}`,
                        color: f.val > 0 ? "#15803d" : "#9ca3af",
                        fontFamily: FONT_BODY,
                      }}>
                        {f.label} {f.val}/{f.max}
                      </span>
                    ))}
                  </div>

                  {/* Fable 판단 근거 */}
                  {cand.fable_reason && (
                    <p style={{
                      fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY,
                      lineHeight: 1.65, margin: "0 0 12px 0",
                      padding: "8px 12px", borderRadius: "6px", background: "#f9fafb",
                      borderLeft: "3px solid #e5e7eb",
                    }}>
                      {cand.fable_reason}
                    </p>
                  )}

                  {/* 수동 플래그: 서북권 + 상태 */}
                  <div style={{
                    display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" as const,
                    paddingTop: "12px", borderTop: "1px solid #f3f4f6",
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={flag.seobukgwon}
                        onChange={e => updateFlag(cand.url, { seobukgwon: e.target.checked })}
                        style={{ cursor: "pointer", width: "14px", height: "14px" }}
                      />
                      <span style={{ fontSize: "12px", color: COLOR_INK, fontFamily: FONT_BODY }}>서북권 연고 ✓</span>
                    </label>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {(["후보", "실선", "탈락"] as const).map(s => {
                        const sc = statusColors[s];
                        const active = flag.userStatus === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateFlag(cand.url, { userStatus: active ? null : s })}
                            style={{
                              padding: "4px 12px", borderRadius: "5px", cursor: "pointer",
                              fontSize: "11px", fontWeight: 600, fontFamily: FONT_BODY,
                              border: `1px solid ${active ? sc.border : "rgba(17,17,17,0.2)"}`,
                              background: active ? sc.bg : "#fff",
                              color: active ? sc.color : COLOR_SUB,
                              transition: "all 0.1s",
                            }}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* GO-① 게이트 A 등록 섹션 */}
                  {regDone.has(cand.url) ? (
                    <div style={{
                      marginTop: "10px", padding: "8px 12px", borderRadius: "6px",
                      background: "#dcfce7", border: "1px solid #86efac",
                      fontSize: "12px", color: "#15803d", fontFamily: FONT_BODY,
                    }}>
                      ✅ Calendar에 등록됨 — 해당 시즌 월 칸에 표시됩니다
                    </div>
                  ) : flag.userStatus === "실선" && (
                    <div style={{ marginTop: "10px" }}>
                      <button
                        onClick={() => toggleRegForm(cand.url, cand.name || "")}
                        style={{
                          fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "5px",
                          border: "1px solid #1d3ab8",
                          background: regForms[cand.url]?.open ? "#1d3ab8" : "#fff",
                          color: regForms[cand.url]?.open ? "#fff" : "#1d3ab8",
                          cursor: "pointer", fontFamily: FONT_BODY,
                        }}>
                        {regForms[cand.url]?.open ? "▲ 등록 폼 닫기" : "게이트 A 등록 → DB"}
                      </button>

                      {regForms[cand.url]?.open && (
                        <div style={{
                          marginTop: "10px", padding: "14px 16px", borderRadius: "8px",
                          background: "#f8f9ff", border: "1px solid #c7d2fe",
                        }}>
                          <p style={{ ...overlineStyle, fontSize: "10px", marginBottom: "10px" }}>검증 확정 · 사람 도장</p>
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                            <label style={{ display: "flex", flexDirection: "column" as const, gap: "3px" }}>
                              <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>브랜드 실명 *</span>
                              <input
                                type="text"
                                value={regForms[cand.url]?.name ?? ""}
                                onChange={e => setRegForms(prev => ({ ...prev, [cand.url]: { ...prev[cand.url], name: e.target.value } }))}
                                placeholder="인스타 실명 브랜드명"
                                style={{ fontSize: "12px", padding: "6px 10px", borderRadius: "5px", border: "1px solid rgba(17,17,17,0.2)", outline: "none", fontFamily: FONT_BODY }}
                              />
                            </label>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <label style={{ display: "flex", flexDirection: "column" as const, gap: "3px", flex: 1 }}>
                                <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>팔로워 수</span>
                                <input
                                  type="number"
                                  value={regForms[cand.url]?.followers ?? ""}
                                  onChange={e => setRegForms(prev => ({ ...prev, [cand.url]: { ...prev[cand.url], followers: e.target.value } }))}
                                  placeholder="0"
                                  style={{ fontSize: "12px", padding: "6px 10px", borderRadius: "5px", border: "1px solid rgba(17,17,17,0.2)", outline: "none", fontFamily: FONT_BODY }}
                                />
                              </label>
                              <label style={{ display: "flex", flexDirection: "column" as const, gap: "3px", flex: 1 }}>
                                <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>팝업 이력 (횟수)</span>
                                <input
                                  type="number"
                                  value={regForms[cand.url]?.popup_count ?? ""}
                                  onChange={e => setRegForms(prev => ({ ...prev, [cand.url]: { ...prev[cand.url], popup_count: e.target.value } }))}
                                  placeholder="0"
                                  style={{ fontSize: "12px", padding: "6px 10px", borderRadius: "5px", border: "1px solid rgba(17,17,17,0.2)", outline: "none", fontFamily: FONT_BODY }}
                                />
                              </label>
                            </div>
                            <label style={{ display: "flex", flexDirection: "column" as const, gap: "3px" }}>
                              <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>시즌 배정 (Calendar 월 배분 기준)</span>
                              <select
                                value={regForms[cand.url]?.season ?? defaultSeason()}
                                onChange={e => setRegForms(prev => ({ ...prev, [cand.url]: { ...prev[cand.url], season: e.target.value } }))}
                                style={{ fontSize: "12px", padding: "6px 10px", borderRadius: "5px", border: "1px solid rgba(17,17,17,0.2)", outline: "none", fontFamily: FONT_BODY, background: "#fff" }}>
                                <option value="spring">Spring (3~5월)</option>
                                <option value="summer">Summer (6~8월)</option>
                                <option value="fall">Fall (9~11월)</option>
                                <option value="winter">Winter (12~2월)</option>
                                <option value="all">연중 (all)</option>
                              </select>
                            </label>
                          </div>
                          <button
                            onClick={() => handleRegister(cand)}
                            disabled={!regForms[cand.url]?.name?.trim() || !!regLoading[cand.url]}
                            style={{
                              marginTop: "12px", width: "100%", padding: "10px", borderRadius: "6px", border: "none",
                              background: (!regForms[cand.url]?.name?.trim() || regLoading[cand.url]) ? "#e5e7eb" : "#1d3ab8",
                              color: (!regForms[cand.url]?.name?.trim() || regLoading[cand.url]) ? "#9ca3af" : "#fff",
                              fontSize: "12px", fontWeight: 700,
                              cursor: (!regForms[cand.url]?.name?.trim() || regLoading[cand.url]) ? "not-allowed" : "pointer",
                              fontFamily: FONT_BODY,
                            }}>
                            {regLoading[cand.url] ? "Claude 분석 + DB 등록 중…" : "검증 확정 → DB 등록"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {matchResult.candidates.length > 0 && (
            <p style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY, marginTop: "10px" }}>
              실선 후보 → "게이트 A 등록" → DB 저장 → Calendar 해당 시즌 월에 표시
            </p>
          )}
        </div>
      )}

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

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            <div>
              <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.45)", marginBottom: "6px", fontSize: "11px" }}>카테고리</p>
              <select value={dorkCat} onChange={e => {
                  const nc = e.target.value;
                  setDorkCat(nc);
                  setMatchCat(nc);
                  if (nc === "bakery_fb") setDorkFollowers("5k-50k");
                  else if (dorkFollowers === "5k-50k") setDorkFollowers("5k-20k");
                }}
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
                {(dorkCat === "bakery_fb" ? FOLLOWER_OPTIONS_FB : FOLLOWER_OPTIONS_DEFAULT).map(f => chipBtn(f.label, dorkFollowers === f.id, () => setDorkFollowers(f.id)))}
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

          <select value={selected} onChange={e => handleSelectCat(e.target.value as CatId)}
            style={{
              width: "100%", fontSize: "12px", padding: "8px 10px", borderRadius: "6px",
              border: `1px solid ${COLOR_RULE}`, background: "#f0f0ee",
              outline: "none", fontFamily: FONT_BODY, color: COLOR_INK,
            }}>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.tag} {c.label}</option>)}
          </select>

          <div>
            <p style={{ ...overlineStyle, marginBottom: "8px" }}>POP-UP INTEREST</p>
            <MiniBarChart bars={staticDetail.bars} labels={staticDetail.labels} />
          </div>

          <StarFit n={displayFit} />

          <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1.65, margin: 0, flex: 1 }}>
            {displayDesc}
          </p>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
            {displayTags.map((t, i) => (
              <span key={i} style={{
                fontSize: "11px", fontWeight: 500, padding: "4px 10px", borderRadius: "5px",
                background: "#ebebea", border: `1px solid ${COLOR_RULE}`, color: COLOR_INK,
                fontFamily: FONT_BODY,
              }}>{t}</span>
            ))}
          </div>

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
            구글 결과에서 URL 복사 → 위 MATCH 섹션에 붙여넣기 → 매칭 돌리기
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
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
                      background: "#fef9c3", border: "1px solid #fde047", color: "#713f12",
                      fontFamily: FONT_BODY,
                    }}>
                      AI 분석 대기 · 익명
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "4px",
                      background: "#f3f4f6", border: `1px solid ${COLOR_RULE}`, color: COLOR_INK,
                      fontFamily: FONT_BODY,
                    }}>
                      {brand.category}
                    </span>
                  </div>
                  {brand.url && (
                    <a href={brand.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "block", fontSize: "13px", fontWeight: 700, color: COLOR_INK,
                        fontFamily: FONT_BODY, wordBreak: "break-all" as const,
                        marginBottom: "6px", textDecoration: "underline",
                        textDecorationColor: "rgba(17,17,17,0.25)",
                      }}>
                      {brand.url} ↗
                    </a>
                  )}
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: "6px",
                    padding: "7px 10px", borderRadius: "6px",
                    background: "#fffbeb", border: "1px solid #fde68a",
                  }}>
                    <span style={{ fontSize: "11px", flexShrink: 0 }}>👆</span>
                    <p style={{ fontSize: "11px", color: "#92400e", fontFamily: FONT_BODY, margin: 0, lineHeight: 1.5 }}>
                      링크 클릭 → 실존 확인 후 확정하세요. 서버는 인스타 계정 생사를 판별할 수 없습니다.
                      <br />
                      "페이지를 사용할 수 없습니다" 뜨면 확정하지 마세요.
                    </p>
                  </div>
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
                  {confirmingId === brand.id ? "확정 + AI 분석 중…" : "Gate A 확정 →"}
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

      {/* ── 후보 발굴 카드 그리드 ── */}
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
