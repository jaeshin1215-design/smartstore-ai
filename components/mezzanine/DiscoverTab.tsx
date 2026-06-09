"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CATS = [
  { id: "performance", label: "공연·굿즈",    tag: "★", verified: true,  comment: "라이콘 실증" },
  { id: "bakery_fb",   label: "F&B·베이커리",  tag: "★", verified: true,  comment: "빵력장터 실증" },
  { id: "wellness",    label: "웰니스",         tag: "★", verified: true,  comment: "MOVFLEX 실증" },
  { id: "outdoor",     label: "캠핑·아웃도어",  tag: "⚡", verified: true, comment: "실제 문의" },
  { id: "fashion",     label: "패션",           tag: "☆", verified: false, comment: "서울 시장 26%" },
  { id: "ip_content",  label: "IP·콘텐츠",      tag: "☆", verified: false, comment: "서울 시장 17%" },
  { id: "beauty",      label: "뷰티",           tag: "☆", verified: false, comment: "시장 근거, 미검증" },
] as const;
type CatId = typeof CATS[number]["id"];

const OP_TYPES = [
  { id: "all",    label: "전체" },
  { id: "event",  label: "이벤트 (단기)" },
  { id: "steady", label: "상설 (입점)" },
] as const;
type OpTypeId = typeof OP_TYPES[number]["id"];

const CTA_TARGET: Record<CatId, string> = {
  performance: "diagnose",
  bakery_fb:   "diagnose",
  wellness:    "diagnose",
  outdoor:     "diagnose",
  fashion:     "diagnose",
  ip_content:  "diagnose",
  beauty:      "diagnose",
};

const STATIC_DETAIL: Record<CatId, {
  desc: string; fit: number; bars: number[]; labels: string[];
  cases: { space: string; dur: string }[]; tags: string[]; cta: string;
}> = {
  performance: {
    desc: "라이콘 오디션(2024) 이 공간 실증. 공연·굿즈 복합 운영으로 체류시간이 길다. B동 무대 구조와 궁합이 좋다.",
    fit: 5, bars: [20, 30, 42, 55, 65, 75, 80], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "라이콘 오디션 (메자닌)", dur: "1일" }, { space: "홍대 인디 굿즈 팝업", dur: "2주" }],
    tags: ["★ 현장 실증", "공연·이벤트", "B동 최적"], cta: "Diagnose에서 공연·굿즈 후보 보기",
  },
  bakery_fb: {
    desc: "빵력장터(2026.05) 이 공간 최대 성공 카테고리. 이벤트 형태 F&B는 별도 영업신고 없이 운영 가능. 서북권 커뮤니티와 결합력이 가장 높다.",
    fit: 5, bars: [30, 45, 58, 72, 80, 88, 95], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "빵력장터 (메자닌)", dur: "1일" }, { space: "홍대 베이커리 팝업", dur: "3주" }],
    tags: ["★ 현장 실증", "이벤트 우선", "영업신고 불필요(이벤트)"], cta: "Diagnose에서 F&B 후보 보기",
  },
  wellness: {
    desc: "MOVFLEX 1유로프로젝트 팝업(2024.12) 이 공간 실증. 인스타 인증샷 유발 지수가 높고 D2C 비율이 높다. 서북권 확장 원하는 웰니스 브랜드 집중.",
    fit: 5, bars: [20, 32, 45, 60, 74, 88, 91], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "MOVFLEX 팝업 (메자닌)", dur: "1주" }, { space: "성수 웰니스 팝업", dur: "6주" }],
    tags: ["★ 현장 실증", "D2C 직판", "팔로워 5천~1.5만"], cta: "Diagnose에서 웰니스 후보 보기",
  },
  outdoor: {
    desc: "캠핑·아웃도어 브랜드 실제 문의 들어옴. 루프탑·340평 오픈 구조가 팝업·체험 행사에 최적. 인바운드 검증 카테고리.",
    fit: 4, bars: [10, 15, 20, 28, 35, 42, 48], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "루프탑 캠핑 체험 (메자닌)", dur: "1일" }, { space: "성수 아웃도어 팝업", dur: "2주" }],
    tags: ["⚡ 인바운드 검증", "루프탑 최적", "실제 문의"], cta: "Diagnose에서 아웃도어 후보 보기",
  },
  fashion: {
    desc: "서울 팝업 시장 26% 점유. 이 공간 미검증 — 파일럿 검증 대상. A·C동 복합 배치 시 체류시간 증가 가능성 있다.",
    fit: 3, bars: [15, 18, 22, 28, 35, 40, 42], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "성수 패션 팝업 A", dur: "3주" }, { space: "홍대 패션 팝업 B", dur: "2주" }],
    tags: ["☆ 시장 가설", "파일럿 검증 필요", "서울 점유 26%"], cta: "Diagnose에서 패션 후보 보기",
  },
  ip_content: {
    desc: "서울 팝업 시장 17% 점유. IP·콘텐츠 팬덤 기반 굿즈 팝업 수요 증가 중. 이 공간 미검증 — 파일럿 필요.",
    fit: 3, bars: [10, 14, 18, 22, 28, 33, 36], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "합정 IP 팝업", dur: "2주" }, { space: "홍대 굿즈샵 팝업", dur: "4주" }],
    tags: ["☆ 시장 가설", "팬덤 기반", "서울 점유 17%"], cta: "Diagnose에서 IP·콘텐츠 후보 보기",
  },
  beauty: {
    desc: "뷰티·스킨케어 팝업 시장 수요 지속 성장. 이 공간 미검증 — 파일럿 검증 대상. 체험형 운영 시 집객력 높다.",
    fit: 3, bars: [12, 16, 20, 26, 32, 38, 40], labels: ["1월","2월","3월","4월","5월","6월","현재"],
    cases: [{ space: "성수 뷰티 팝업", dur: "3주" }, { space: "마포 스킨케어 팝업", dur: "2주" }],
    tags: ["☆ 시장 가설", "체험형 강점", "파일럿 검증 필요"], cta: "Diagnose에서 뷰티 후보 보기",
  },
};

// 이미 검증된 seed 브랜드 (실존 확인 완료)
const SEED_BRANDS = [
  { name: "봄날엔",  handle: "@bom_nalen",       category: "웰니스",    note: "MOVFLEX 연계 공간 이력" },
  { name: "MOVFLEX", handle: "@movflex_official", category: "웰니스",    note: "이 공간 실증 (2024.12)" },
  { name: "빵력장터", handle: "@bbang_market",    category: "F&B·베이커리", note: "이 공간 실증 (2026.05)" },
];

interface LiveCatData { description: string; tags: string[]; matchRate: number; why: string; risk: string; }
interface DorkQuery { query: string; desc: string; tip: string; }

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

interface Props {
  onSelectCategory: (cat: { id: string; label: string; matchRate: number | null }) => void;
  onNavigate: (tabId: string, updates?: Record<string, unknown>) => void;
  onSuggestBrand?: (brand: { name: string; instagram_handle: string; category: string; reason: string }) => void;
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
            <stop offset="0%" stopColor="#3b4fd8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b4fd8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v} x1={PX} x2={W - PX}
            y1={PY + (1 - v) * (H - PY * 2)} y2={PY + (1 - v) * (H - PY * 2)}
            stroke="#f0f1f3" strokeWidth="1" />
        ))}
        <polygon points={area} fill="url(#dg1)" />
        <polyline points={poly} fill="none" stroke="#3b4fd8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r="3.5" fill="#1d3ab8" stroke="white" strokeWidth="1.5" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#3b4fd8" stroke="white" strokeWidth="1.5" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "2px", paddingLeft: "4px", paddingRight: "4px", color: "#b0b5bc" }}>
        {[0, Math.floor((bars.length - 1) / 2), bars.length - 1].map(i => (
          <span key={i}>{labels[i]}</span>
        ))}
      </div>
    </div>
  );
}

function MatchRateBar({ rate }: { rate: number }) {
  const clamped = Math.min(100, Math.max(0, rate));
  const color = clamped >= 75 ? "#3b4fd8" : clamped >= 55 ? "#6272c4" : "#9ca3af";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0, width: "52px" }}>
      <div style={{ height: "5px", borderRadius: "999px", background: "#e8eaed" }}>
        <div style={{ height: "5px", borderRadius: "999px", width: `${clamped}%`, background: color, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: "10px", fontWeight: 700, color, textAlign: "right" }}>{clamped}</span>
    </div>
  );
}

function StarFit({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: "14px", color: i <= n ? "#fbbf24" : "#e5e7eb" }}>★</span>
      ))}
      <span style={{ fontSize: "11px", color: "#6b7280", marginLeft: "4px" }}>이 공간 기준 적합도</span>
    </div>
  );
}

export default function DiscoverTab({ onSelectCategory, onNavigate }: Props) {
  const [selected,    setSelected]    = useState<CatId>("wellness");
  const [isLive,      setIsLive]      = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveData,    setLiveData]    = useState<Record<string, LiveCatData>>({});
  const [ownerRev,    setOwnerRev]    = useState<Record<string, string>>({});

  /* dorking state */
  const [dorkCat,       setDorkCat]       = useState("wellness");
  const [dorkOpType,    setDorkOpType]    = useState<OpTypeId>("all");
  const [dorkFollowers, setDorkFollowers] = useState("5k-20k");
  const [dorkPopup,     setDorkPopup]     = useState("1-3");
  const [dorkRegion,    setDorkRegion]    = useState("서북권");
  const [dorking,       setDorking]       = useState(false);
  const [dorkQueries,   setDorkQueries]   = useState<DorkQuery[]>([]);
  const [dorkError,     setDorkError]     = useState("");

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
      const json = await res.json() as { queries?: DorkQuery[]; error?: string };
      if (json.queries?.length) {
        setDorkQueries(json.queries);
      } else {
        setDorkError("검색식 생성에 실패했습니다. 잠시 후 다시 시도하세요.");
      }
    } catch (e) {
      setDorkError(String(e));
    }
    setDorking(false);
  };

  const chipBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      padding: "5px 10px", borderRadius: "6px",
      border: `1px solid ${active ? "#3b4fd8" : "#e8eaed"}`,
      background: active ? "#eff6ff" : "#fafafa",
      color: active ? "#1d4ed8" : "#6b7280",
      fontSize: "11px", fontWeight: active ? 700 : 400,
      cursor: "pointer", fontFamily: FF, whiteSpace: "nowrap" as const,
    }}>{label}</button>
  );

  const sortedCats = isLive && Object.keys(liveData).length > 0
    ? [...CATS].sort((a, b) => (liveData[b.id]?.matchRate ?? 0) - (liveData[a.id]?.matchRate ?? 0))
    : [...CATS];

  const staticDetail = STATIC_DETAIL[selected];
  const live = liveData[selected];
  const displayDesc = live?.description ?? staticDetail.desc;
  const displayTags = live?.tags ?? staticDetail.tags;
  const displayFit  = live ? Math.min(5, Math.max(1, Math.round(live.matchRate / 20))) : staticDetail.fit;

  const handleCTA = () => {
    const cat = CATS.find(c => c.id === selected)!;
    onSelectCategory({ id: selected, label: cat.label, matchRate: liveData[selected]?.matchRate ?? null });
    onNavigate(CTA_TARGET[selected]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,720px)", gap: "0 25vw", fontFamily: FF }}>

      {/* ── 좌: 사이드바 ── */}
      <div style={{ background: "#F7F8FA", borderRight: "1px solid #e8eaed", borderRadius: "8px", padding: "14px 12px", overflowY: "auto" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "10px" }}>
          이 공간 적합 카테고리
        </p>
        <DemoBadge note="예시 데이터 — 파일럿 후 실데이터로 자동 교체" />

        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "12px" }}>
          {sortedCats.map((cat, idx) => {
            const isActive = selected === cat.id;
            const rate = liveData[cat.id]?.matchRate;
            return (
              <div key={cat.id} onClick={() => handleSelectCat(cat.id)} style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "8px 10px", borderRadius: "7px", cursor: "pointer",
                background: isActive ? "#fff" : "transparent",
                border: isActive ? "1px solid #e8eaed" : "1px solid transparent",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.12s ease",
              }}>
                <span style={{
                  fontSize: "11px", fontWeight: 500, width: "18px", height: "18px",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  border: "1px solid #d5d8dc", borderRadius: "4px", color: "#9ca3af",
                }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 1px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: cat.verified ? (cat.tag === "⚡" ? "#f59e0b" : "#f59e0b") : "#d1d5db", marginRight: "3px", fontSize: "11px" }}>{cat.tag}</span>
                    {cat.label}
                  </p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>{cat.comment}</p>
                </div>
                {rate !== undefined ? <MatchRateBar rate={rate} /> : <div style={{ width: "52px" }} />}
              </div>
            );
          })}
        </div>

        {isLive ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#3b4fd8", fontWeight: 600, padding: "5px 8px", borderRadius: "5px", border: "1px solid #c7d2fe", background: "#eff6ff" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b4fd8", display: "inline-block", animation: "pulse 2s infinite" }} />
              라이브 실행 중
            </div>
            <button onClick={fetchLiveDiscover} disabled={liveLoading}
              style={{ width: "100%", padding: "6px 8px", background: "#fff", border: "1px solid #3b4fd8", borderRadius: "5px", fontSize: "10px", color: liveLoading ? "#9ca3af" : "#3b4fd8", fontWeight: 600, cursor: liveLoading ? "not-allowed" : "pointer", fontFamily: FF }}>
              {liveLoading ? "분석 중..." : "↺ 다시 돌리기"}
            </button>
          </div>
        ) : (
          <button onClick={fetchLiveDiscover} disabled={liveLoading}
            style={{ width: "100%", padding: "8px", background: liveLoading ? "#f0f1f3" : "#3b4fd8", border: "none", borderRadius: "5px", fontSize: "11px", color: liveLoading ? "#9ca3af" : "#fff", fontWeight: 600, cursor: liveLoading ? "not-allowed" : "pointer", fontFamily: FF }}>
            {liveLoading ? "⏳ 분석 중..." : "▶ 라이브 Discover 실행"}
          </button>
        )}
      </div>

      {/* ── 우: 메인 ── */}
      <div style={{ padding: "20px 0", overflowY: "auto" }}>

        {/* ── Dorking 발굴 섹션 ── */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: "10px", padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: 0 }}>
              🔍 AI 구글 검색식 생성
            </p>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #86efac", padding: "1px 7px", borderRadius: "4px" }}>
              가짜 0
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.65, marginBottom: "16px" }}>
            AI가 <strong>브랜드명을 생성하지 않습니다.</strong> 구글 검색식(dorking)만 만들고,
            구글이 실존 인스타 URL을 반환합니다. 계정명을 안 만드니 할루시네이션이 구조적으로 불가능합니다.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>카테고리</p>
              <select value={dorkCat} onChange={e => setDorkCat(e.target.value)}
                style={{ width: "100%", fontSize: "12px", padding: "7px 10px", borderRadius: "6px", border: "1px solid #e8eaed", background: "#f9fafb", outline: "none", fontFamily: FF, color: "#1a1a1a" }}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.tag} {c.label}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>운영 형태</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {OP_TYPES.map(o => chipBtn(o.label, dorkOpType === o.id, () => setDorkOpType(o.id)))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>팔로워</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {FOLLOWER_OPTIONS.map(f => chipBtn(f.label, dorkFollowers === f.id, () => setDorkFollowers(f.id)))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>팝업이력</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {POPUP_OPTIONS.map(p => chipBtn(p.label, dorkPopup === p.id, () => setDorkPopup(p.id)))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>지역</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {REGION_OPTIONS.map(r => chipBtn(r.label, dorkRegion === r.id, () => setDorkRegion(r.id)))}
              </div>
            </div>
          </div>

          <button onClick={handleDork} disabled={dorking} style={{
            width: "100%", padding: "11px", borderRadius: "7px",
            background: dorking ? "#d1d5db" : "#1d4ed8",
            color: "#fff", border: "none", fontSize: "13px", fontWeight: 700,
            cursor: dorking ? "not-allowed" : "pointer", fontFamily: FF,
          }}>
            {dorking ? "검색식 생성 중..." : "구글 검색식 생성하기 →"}
          </button>
        </div>

        {/* 생성된 검색식 카드들 */}
        {dorkQueries.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #86efac", padding: "3px 10px", borderRadius: "6px" }}>
                ✓ AI 생성 검색식 — 구글이 실존 URL 반환
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{dorkQueries.length}개 쿼리</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {dorkQueries.map((q, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #d1fae5", borderRadius: "10px", padding: "16px 18px" }}>
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
                      <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 4px 0", lineHeight: 1.5 }}>{q.desc}</p>
                      {q.tip && <p style={{ fontSize: "11px", color: "#6b7280", margin: 0, lineHeight: 1.4 }}>💡 {q.tip}</p>}
                    </div>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(q.query)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        fontSize: "12px", fontWeight: 700, padding: "8px 14px",
                        borderRadius: "7px", border: "none",
                        background: "#1d4ed8", color: "#fff",
                        textDecoration: "none", fontFamily: FF,
                        whiteSpace: "nowrap" as const, flexShrink: 0,
                        display: "inline-flex", alignItems: "center", gap: "4px",
                      }}>
                      구글에서 열기 ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px", lineHeight: 1.55 }}>
              구글 결과에서 팔로워 수(스니펫)로 1차 필터 → 인스타 클릭 실존 확인 → Setup 탭에서 직접 등록
            </p>
          </div>
        )}

        {dorkError && (
          <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "7px", background: "#fef2f2", border: "1px solid #fca5a5", fontSize: "12px", color: "#dc2626" }}>
            {dorkError}
          </div>
        )}

        {/* Seed 브랜드 (이미 검증됨) */}
        <div style={{ background: "#fff", border: "1px solid #d1fae5", borderRadius: "10px", padding: "16px 20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #86efac", padding: "2px 8px", borderRadius: "4px" }}>
              ✓ 실존 확인 완료
            </span>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>이 공간 이력 seed 브랜드 — 등록 기준점</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
            {SEED_BRANDS.map((b, i) => (
              <div key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", minWidth: "160px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#166534", margin: "0 0 2px 0" }}>{b.name}</p>
                <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 4px 0" }}>{b.handle}</p>
                <p style={{ fontSize: "10px", color: "#15803d", margin: 0 }}>{b.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 카테고리 시장 분석 (참고) ── */}
        <div style={{ borderTop: "1px solid #e8eaed", paddingTop: "20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c0c4cc", marginBottom: "16px" }}>
            참고 — 카테고리 시장 분석
          </p>

          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
              {CATS.find(c => c.id === selected)?.label}
            </h2>
            <StarFit n={displayFit} />
          </div>

          <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>{displayDesc}</p>

          {live && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
              <div style={{ padding: "14px 16px", background: "#f0f4ff", borderRadius: "8px", border: "1px solid #c7d2fe" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#3b4fd8", margin: "0 0 6px 0" }}>💡 발굴 이유</p>
                <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.65, margin: 0 }}>{live.why}</p>
              </div>
              <div style={{ padding: "14px 16px", background: "#fefce8", borderRadius: "8px", border: "1px solid #fde68a" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#92400e", margin: "0 0 6px 0" }}>⚠️ 공간적 한계</p>
                <p style={{ fontSize: "13px", color: "#78350f", lineHeight: 1.65, margin: 0 }}>{live.risk}</p>
              </div>
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8eaed", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px 24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: 0 }}>팝업 관심 지수 추이</p>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>예시 데이터</span>
            </div>
            <MiniBarChart bars={staticDetail.bars} labels={staticDetail.labels} />
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8eaed", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px 24px", marginBottom: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px" }}>유사 공간 사례</p>
            <div style={{ display: "flex", gap: "12px" }}>
              {staticDetail.cases.map((c, i) => {
                const key = `${selected}-${i}`;
                return (
                  <div key={i} style={{ flex: 1, padding: "14px 16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e8eaed" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827", margin: "0 0 10px 0" }}>{c.space}</p>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                      <div>
                        <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 2px 0" }}>운영 기간</p>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: 0 }}>{c.dur}</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 3px 0" }}>평균 매출 (주)</p>
                        <input type="text" value={ownerRev[key] ?? ""} onChange={e => setOwnerRev(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="대표님 감으로"
                          style={{ fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "5px", border: "1px solid #e8eaed", background: "#fff", width: "100%", outline: "none", color: "#374151", fontFamily: FF }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" as const, marginBottom: "28px" }}>
            {displayTags.map((t, i) => (
              <span key={i} style={{ fontSize: "12px", fontWeight: 500, padding: "5px 12px", borderRadius: "6px", background: "#f0f4ff", border: "1px solid #c7d2fe", color: "#3b4fd8" }}>{t}</span>
            ))}
          </div>

          <div onClick={handleCTA}
            style={{ background: "#f0f4ff", borderRadius: "8px", border: "1px solid #c7d2fe", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "background 0.15s ease" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e0eaff")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f0f4ff")}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#3b4fd8" }}>→ {staticDetail.cta}</span>
            <span style={{ fontSize: "12px", color: "#6272c4", flexShrink: 0 }}>탭 전환 →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
