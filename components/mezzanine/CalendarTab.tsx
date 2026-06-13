"use client";

import { useState, useEffect } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import {
  FONT_SERIF, FONT_BODY,
  COLOR_INK, COLOR_SUB, COLOR_RULE,
  TEXT_CAPTION_SIZE, TRACKING_OVERLINE,
} from "@/lib/tokens";
import { CATEGORIES } from "@/lib/categories";

// ── 카테고리 한글 매핑
const CATEGORY_KR: Record<string, string> = {
  performance: "공연·굿즈",
  bakery_fb:   "F&B·베이커리",
  wellness:    "웰니스",
  outdoor:     "아웃도어",
  fashion:     "패션·굿즈",
  ip_content:  "IP·콘텐츠",
  beauty:      "바디케어",
  bodycare:    "바디케어",
  lifestyle:   "라이프스타일",
};

const MONTH_SEASON: Record<number, string> = {
  1: "winter", 2: "winter",
  3: "spring", 4: "spring", 5: "spring",
  6: "summer", 7: "summer", 8: "summer",
  9: "fall",  10: "fall",  11: "fall",
  12: "winter",
};

const SEASON_EN: Record<string, string> = {
  spring: "SPRING", summer: "SUMMER", fall: "FALL", winter: "WINTER",
};

// 저채도 시즌 컬러필드 (B방식 — 불투명 면)
const SEASON_BG: Record<string, string> = {
  spring: "#dfe5da",
  summer: "#dbe3ea",
  fall:   "#e9e1d4",
  winter: "#e3e3e5",
};

// 영문 월 (세리프 대형 제목)
const MONTH_EN  = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_KR  = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

// ── 12개월 시나리오 (Wendy+Jae 기획서 v1 · 2026-06-12) ─────────────────────
interface MonthScenario {
  theme:   string;
  anchor:  string;
  target:  string;
  fb:      string;
  killer:  string;
  weekly?: { label: string; desc: string }[];
}
const MONTH_SCENARIOS: Record<number, MonthScenario> = {
  1:  { theme: "새해의 책상",          anchor: "캘리그래피·타이포 전시",     target: "다이어리·문구·웰니스 리추얼", fb: "따뜻한 음료·구움과자 완제품",   killer: "루프탑 새해 목표 우체통 인증샷" },
  2:  { theme: "나에게 주는 선물",      anchor: "사진·일러스트 소품 전시",    target: "향·뷰티·자기관리 굿즈",       fb: "초콜릿·디저트 완제품",           killer: "발렌타인 셀프기프트 코너" },
  3:  { theme: "봄의 재정비",           anchor: "식물·보태니컬 설치",         target: "리빙·문구·라이프스타일 D2C",  fb: "봄 시즌 베이커리 완제품",        killer: "개강·새출발 책상 꾸리기 존" },
  4:  { theme: "피크닉 클럽",           anchor: "야외사진·풍경 전시",         target: "아웃도어·피크닉 굿즈·리빙",   fb: "피크닉 박스 완제품",             killer: "루프탑 피크닉 세트 포토존" },
  5:  { theme: "함께의 달",             anchor: "가족·기록 테마 전시",        target: "키즈·패밀리 굿즈·선물 소품",  fb: "답례·선물용 구움과자",           killer: "가정의 달 가족 인증샷 동선" },
  6:  { theme: "회복의 시작",           anchor: "빛 테마 사진전",             target: "바디케어·향 (노크콤마 ✅)",    fb: "여름 음료·빙과 완제품",          killer: "시향 바 — 퇴근길 회복 루틴" },
  7:  {
    theme:  "한여름의 회복 — 빛, 향, 피부",
    anchor: "김중만 사진전 × 향 콜라보 (확인 전)",
    target: "바디·향·웰니스 5~6팀",
    fb:     "로컬 로스터리·베이커리 완제품",
    killer: "수요 야간 개장 + 루프탑 앰비언트",
    weekly: [
      { label: "1W 오픈",      desc: "「빛과 향」 개막·동선 강제·인증샷 KPI" },
      { label: "2W 향의 주말", desc: "라인업 절반 교체 + 수요 야간 개장" },
      { label: "3W 루틴",      desc: "유료 클래스·체류↑·1차 데이터 집계" },
      { label: "4W 피크",      desc: "마지막 야간 개장·루프탑 선셋·한정 소진전" },
    ],
  },
  8:  { theme: "서머 나이트",           anchor: "야간 미디어·라이트 설치",    target: "향·홈프래그런스·여름 리빙",   fb: "빙과·콜드브루 완제품",           killer: "금요일 밤 루프탑 선셋 마켓" },
  9:  { theme: "로컬 메이커 — 가을 장", anchor: "서북권 작가 그룹전",         target: "굿즈·문구·일러스트 작가팀",   fb: "가을 베이커리 완제품",           killer: "작가가 직접 서는 주말 부스 ★실행 1호" },
  10: { theme: "페이퍼 & 아트",         anchor: "일러스트·판화 전시",         target: "문구·아트프린트·소량 출판",   fb: "차(茶)·디저트 완제품",           killer: "수집형 마켓 주말" },
  11: { theme: "온기",                  anchor: "패브릭·공예 전시",           target: "니트·홈패브릭·캔들·리빙",     fb: "따뜻한 디저트 완제품",           killer: "첫 캔들 켜는 날 점등 주말" },
  12: { theme: "선물",                  anchor: "윈터 라이트 + 연말 회고전",  target: "기프트세트·뷰티·향",          fb: "홀리데이 베이커리 완제품",       killer: "크리스마스 마켓 클로징 — 1년 피날레" },
};

// ── 김중만 사진 매핑 (12개월) ─────────────────────────────────────────────
interface MonthPhoto {
  file:        string | null;  // null = 플레이스홀더 (9월 등 미확보)
  series:      string;
  description: string;
}
const MONTH_PHOTO: Record<number, MonthPhoto> = {
  1:  { file: "3.jpg",  series: "FLOWERS",          description: "붉은 모란" },
  2:  { file: "6.jpg",  series: "네이키드 소울",     description: "흑백 수련" },
  3:  { file: "2.jpg",  series: "FLOWERS",          description: "만개 · 주황 꽃" },
  4:  { file: "9.jpg",  series: "70년대",            description: "해변 실루엣" },
  5:  { file: "5.jpg",  series: "아프리카",          description: "영양 떼 · 리듬" },
  6:  { file: "1.jpg",  series: "네이키드 소울",     description: "흑백 꽃" },
  7:  { file: "7.jpg",  series: "아프리카",          description: "사바나 · 고목" },
  8:  { file: "8.jpg",  series: "STAR",             description: "달 · 나무" },
  9:  { file: "9.png",  series: "포트레이트",        description: "영화 포스터 · 인물" },
  10: { file: "11.png", series: "뚝방길",            description: "수묵 · 흑백 건물" },
  11: { file: "10.png", series: "80년대 흑백",       description: "나무 · 방랑" },
  12: { file: "12.jpg", series: "겨울 성좌 · STAR",  description: "절벽 · 초승달" },
};

interface CalBrand {
  id: string;
  name: string;
  category: string;
  season: string;
  lx: number;
  ly: number;
  followers: number;
  status: string;
  contact_status: string;
}

function zoneLabel(b: CalBrand): { text: string; bg: string; color: string; border: string } {
  const s = b.status ?? "ai_draft";
  const c = b.contact_status ?? "untouched";
  if (s === "MANUAL_VERIFIED" && c === "confirmed") {
    return { text: "LIVE", bg: "#dcfce7", color: "#15803d", border: "#86efac" };
  }
  if (s === "MANUAL_VERIFIED") {
    return { text: "대기", bg: "#dbeafe", color: "#1d40af", border: "#93c5fd" };
  }
  return { text: "충진", bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" };
}

interface CalendarTabProps {
  filter: { category: string; dong: string; season: string };
  onNavigate: (tabId: string, updates?: Record<string, unknown>) => void;
  onFilterChange: (filter: { category: string; dong: string; season: string }) => void;
}

const MATCH_SESSION_KEY = "mezzanine_harness_session";

// 세션 후보 카테고리별 뱃지 스타일 (점선 구분)
const SESSION_CAT_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  wellness:    { bg: "#dbeafe", color: "#1d40af", border: "#93c5fd",  label: "웰니스" },
  bakery_fb:   { bg: "#e9e1d4", color: "#92400e", border: "#fde68a",  label: "F&B" },
  performance: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd",  label: "공연·굿즈" },
  outdoor:     { bg: "#dcfce7", color: "#15803d", border: "#86efac",  label: "아웃도어" },
  fashion:     { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4",  label: "패션" },
  ip_content:  { bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc",  label: "IP·콘텐츠" },
  beauty:      { bg: "#ffe4e6", color: "#9f1239", border: "#fda4af",  label: "뷰티" },
  기타:          { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db",  label: "기타" },
};

// 주차별 흐름 — weekly 미정의 월은 시나리오 데이터로 합성
function getWeekly(month: number): { label: string; desc: string }[] {
  const s = MONTH_SCENARIOS[month];
  if (!s) return [];
  if (s.weekly) return s.weekly;
  return [
    { label: "1W 오픈",  desc: `${s.anchor} 개막 · 동선 설계 · 첫 주말 집객` },
    { label: "2W 중반",  desc: `${s.target} 라인업 안착 · 미드위크 방문 유도` },
    { label: "3W 루틴",  desc: "체류시간↑ · 재방문 캠페인 · 1차 데이터 집계" },
    { label: "4W 피크",  desc: `마지막 주말 집중 · ${s.killer} · 시즌 마감` },
  ];
}

export default function CalendarTab({ filter, onNavigate, onFilterChange }: CalendarTabProps) {
  const [rawBrands, setRawBrands]       = useState<CalBrand[]>([]);
  const [brands, setBrands]             = useState<CalBrand[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number> | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const ALL_CATS = ["wellness","bakery_fb","performance","outdoor","fashion","ip_content","beauty"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MATCH_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown[]>;
        const counts: Record<string, number> = {};
        for (const cat of ALL_CATS) {
          const n = (parsed[cat] ?? []).length;
          if (n > 0) counts[cat] = n;
        }
        // 기타: 7개 카테고리 외 키
        const 기타Count = Object.entries(parsed)
          .filter(([k]) => k !== "_lastCat" && !ALL_CATS.includes(k))
          .reduce((acc, [, v]) => acc + (Array.isArray(v) ? v.length : 0), 0);
        if (기타Count > 0) counts["기타"] = 기타Count;
        if (Object.keys(counts).length > 0) setSessionCounts(counts);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/mezzanine/brands")
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d.brands)) return;
        const mapped = d.brands.map((b: Record<string, unknown>) => ({
          id:             String(b.id             ?? ""),
          name:           String(b.name           ?? ""),
          category:       String(b.category       ?? ""),
          season:         String(b.season         ?? "all"),
          lx:             Number(b.matrix_x)      || 50,
          ly:             Number(b.matrix_y)      || 50,
          followers:      Number(b.followers)     || 0,
          status:         String(b.status         ?? "ai_draft"),
          contact_status: String(b.contact_status ?? "untouched"),
        }));
        setRawBrands(mapped);
        setBrands(mapped);
        setBrandsLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!brandsLoaded || rawBrands.length === 0) return;
    setLoading(true);

    const ft = [
      filter.category !== "all" ? filter.category : null,
      filter.season   !== "all" ? SEASON_EN[filter.season]?.toLowerCase() : null,
    ].filter(Boolean).join("·") || undefined;

    fetch("/api/mezzanine/matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brands: rawBrands.slice(0, 20).map(b => ({
          id:       b.id,
          name:     `후보_${b.id.slice(-4)}`,
          keyword:  b.category,
          category: b.category,
          is_own:   1,
        })),
        filterTarget: ft,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d.results)) return;
        const map = new Map(
          (d.results as { id: string; x: number; y: number }[]).map(r => [r.id, r])
        );
        setBrands(rawBrands.map(b => {
          const c = map.get(b.id);
          return c ? { ...b, lx: c.x, ly: c.y } : b;
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandsLoaded, filter.category, filter.season]);

  function getBrandsForMonth(month: number): { brand: CalBrand; role: "target" | "fb" }[] {
    const mSeason      = MONTH_SEASON[month];
    const seasonMonths = [1,2,3,4,5,6,7,8,9,10,11,12].filter(m => MONTH_SEASON[m] === mSeason);
    const posInSeason  = seasonMonths.indexOf(month);

    // MANUAL_VERIFIED — followers 내림차순
    const allVerified = brands
      .filter(b => b.status === "MANUAL_VERIFIED" && (b.season === "all" || b.season === mSeason))
      .sort((a, b) => b.followers - a.followers);

    // 2층: bakery_fb → F&B 헤드라이너 / 나머지 전원 → TARGET PARTNERS (앵커 브랜드 바인딩 없음)
    const fbVerified    = allVerified.filter(b => b.category === "bakery_fb");
    const nonFbVerified = allVerified.filter(b => b.category !== "bakery_fb");

    // ai_draft 충진 풀
    const drafts = brands
      .filter(b => b.status !== "MANUAL_VERIFIED" && (b.season === "all" || b.season === mSeason))
      .sort((a, b) => b.followers - a.followers);
    const draftStart   = (posInSeason * 2) % Math.max(drafts.length, 1);
    const draftRotated = [...drafts.slice(draftStart), ...drafts.slice(0, draftStart)];

    const result: { brand: CalBrand; role: "target" | "fb" }[] = [];
    const used = new Set<string>();

    // F&B 헤드라이너 — bakery_fb 전원
    for (const b of fbVerified) {
      if (!used.has(b.id)) { result.push({ brand: b, role: "fb" }); used.add(b.id); }
    }

    // TARGET PARTNERS — non-FB verified 전원 (실명 보장)
    for (const b of nonFbVerified) {
      if (!used.has(b.id)) { result.push({ brand: b, role: "target" }); used.add(b.id); }
    }

    // draft 충진 (target 최대 4개)
    for (const b of draftRotated) {
      if (result.filter(r => r.role === "target").length >= 4) break;
      if (!used.has(b.id)) { result.push({ brand: b, role: "target" }); used.add(b.id); }
    }

    return result;
  }

  function handleCellClick(month: number) {
    setSelectedMonth(month);
  }

  const MONTHS  = [1,2,3,4,5,6,7,8,9,10,11,12];
  const visible = filter.season === "all"
    ? MONTHS
    : MONTHS.filter(m => MONTH_SEASON[m] === filter.season);

  const sidebarCats = CATEGORIES.filter(c => c.id !== "all");

  const overlineStyle: React.CSSProperties = {
    fontSize: TEXT_CAPTION_SIZE, fontWeight: 500,
    textTransform: "uppercase", letterSpacing: TRACKING_OVERLINE,
    color: "#9ca3af", fontFamily: FONT_BODY,
    margin: 0,
  };

  // ── 해부도 뷰 (도록 톤 · 월 클릭 시 렌더) ─────────────────────────────────
  if (selectedMonth !== null) {
    const month    = selectedMonth;
    const sc       = MONTH_SCENARIOS[month];
    const mSeason  = MONTH_SEASON[month];
    const weekly   = getWeekly(month);
    const slots    = getBrandsForMonth(month);
    const fbBrands = slots.filter(s => s.role === "fb");
    const targets  = slots.filter(s => s.role === "target");
    const photo    = MONTH_PHOTO[month] ?? { file: null, series: "—", description: "—" };

    const divider: React.CSSProperties = {
      borderTop: "0.5px solid rgba(17,17,17,0.12)",
      paddingTop: "32px",
      marginTop: "32px",
    };

    return (
      <div style={{ width: "100%", maxWidth: "860px" }}>

        {/* ── 1. 네비 + 월 라벨 ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px" }}>
          <button
            onClick={() => setSelectedMonth(null)}
            style={{
              border: `1px solid ${COLOR_RULE}`, borderRadius: "6px",
              background: "#fff", cursor: "pointer",
              padding: "6px 14px", fontFamily: FONT_BODY,
              fontSize: "12px", color: COLOR_SUB,
            }}
          >
            ← 캘린더로
          </button>
          <div style={{ textAlign: "right" }}>
            <p style={{
              fontFamily: FONT_BODY, fontSize: "11px",
              letterSpacing: "0.18em", color: "#9ca3af",
              textTransform: "uppercase", margin: "0 0 3px",
            }}>
              {SEASON_EN[mSeason]} · {MONTH_EN[month - 1]}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
              <p style={{
                fontFamily: FONT_BODY, fontSize: "10px",
                letterSpacing: "0.08em", color: "#bdbdbd",
                margin: 0, textTransform: "uppercase",
              }}>
                {String(month).padStart(2, "0")} / 12 · 운영 해부도
              </p>
              <span style={{
                fontSize: "9px", fontWeight: 500,
                padding: "2px 8px", borderRadius: "4px",
                background: "#fef9c3", color: "#92400e",
                border: "1px solid #fde68a",
                fontFamily: FONT_BODY, letterSpacing: "0.04em",
              }}>
                가상 시나리오 · 예시
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. 도록 히어로 — 좌 사진 3:4 / 우 앵커 텍스트 ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "260px 1fr",
          gap: "2.5rem", alignItems: "start",
        }}>

          {/* 좌: 사진 슬롯 + 캡션 */}
          <div>
            <div style={{
              aspectRatio: "3 / 4",
              border: "0.5px solid rgba(17,17,17,0.15)",
              borderRadius: "4px",
              overflow: "hidden",
              background: "#f5f5f3",
            }}>
              {photo.file ? (
                <img
                  src={`/images/kimjungman/${photo.file}`}
                  alt={`${photo.series} — ${photo.description}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "10px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(17,17,17,0.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p style={{
                    fontSize: "10px", color: "rgba(17,17,17,0.3)",
                    fontFamily: FONT_BODY, margin: 0,
                    textAlign: "center", lineHeight: 1.6,
                  }}>
                    {photo.series}<br/>사진 확보 전
                  </p>
                </div>
              )}
            </div>
            {/* 캡션 */}
            <div style={{ marginTop: "12px" }}>
              <p style={{ fontFamily: FONT_SERIF, fontSize: "12px", fontWeight: 400, color: COLOR_INK, margin: "0 0 1px" }}>
                Kim Jung Man
              </p>
              <p style={{ fontFamily: FONT_SERIF, fontSize: "12px", fontStyle: "italic", fontWeight: 400, color: COLOR_INK, margin: "0 0 5px" }}>
                {photo.series}
              </p>
              <p style={{ fontFamily: FONT_BODY, fontSize: "11px", color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>
                {photo.description} · 무드 레퍼런스
              </p>
            </div>
          </div>

          {/* 우: 앵커 텍스트 위계 */}
          <div style={{ paddingTop: "6px" }}>
            <p style={{
              fontFamily: FONT_BODY, fontSize: "10px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: "#9ca3af", margin: "0 0 16px",
            }}>
              Anchor Direction
            </p>
            <h2 style={{
              fontFamily: FONT_SERIF, fontSize: "clamp(22px, 2.5vw, 30px)",
              fontWeight: 400, color: COLOR_INK,
              letterSpacing: "-0.02em", lineHeight: 1.15,
              margin: "0 0 10px",
            }}>
              {sc?.anchor ?? "—"}
            </h2>
            <p style={{
              fontFamily: FONT_SERIF, fontSize: "17px",
              fontStyle: "italic", fontWeight: 400,
              color: COLOR_SUB, margin: "0 0 22px", lineHeight: 1.35,
            }}>
              {sc?.theme ?? "—"}
            </p>
            {sc?.killer && (
              <p style={{
                fontFamily: FONT_BODY, fontSize: "14px", color: COLOR_INK,
                margin: "0 0 28px", lineHeight: 1.75,
                maxWidth: "38ch",
              }}>
                {sc.killer}
              </p>
            )}
            {/* 무드 배지 */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontFamily: FONT_BODY, fontSize: "11px", color: "#3b82f6", letterSpacing: "0.02em" }}>
                무드 레퍼런스 · 비전 예시
              </span>
            </div>
            <span style={{
              display: "inline-block", fontFamily: FONT_BODY,
              fontSize: "9px", fontWeight: 500,
              padding: "2px 8px", borderRadius: "4px",
              background: "#f3f4f6", color: "#6b7280",
              border: "1px solid #d1d5db", letterSpacing: "0.04em",
            }}>
              섭외 미확정
            </span>
          </div>
        </div>

        {/* ── 3. F&B 헤드라이너 · TARGET PARTNERS — 2단 ── */}
        <div style={{ ...divider }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

            {/* F&B 헤드라이너 */}
            <div>
              <p style={{ ...overlineStyle, marginBottom: "14px" }}>F&B 헤드라이너 · 완제품</p>
              {fbBrands.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {fbBrands.map(({ brand }) => {
                    const lbl = zoneLabel(brand);
                    return (
                      <div key={brand.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "8px", fontWeight: 500, padding: "2px 6px", borderRadius: "3px",
                          background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                          fontFamily: FONT_BODY, flexShrink: 0,
                        }}>{lbl.text}</span>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: COLOR_INK, fontFamily: FONT_BODY }}>
                          {brand.status === "MANUAL_VERIFIED" && brand.name
                            ? brand.name
                            : `F&B · ${CATEGORY_KR[brand.category] ?? brand.category} 후보`}
                        </span>
                      </div>
                    );
                  })}
                  {sc?.fb && (
                    <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: "4px 0 0", lineHeight: 1.55 }}>
                      {sc.fb}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: COLOR_INK, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.7 }}>
                  {sc?.fb ?? "—"}
                </p>
              )}
            </div>

            {/* TARGET PARTNERS */}
            <div>
              <p style={{ ...overlineStyle, marginBottom: "14px" }}>TARGET PARTNERS</p>
              {targets.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {targets.map(({ brand }) => {
                    const lbl = zoneLabel(brand);
                    return (
                      <div key={brand.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "8px", fontWeight: 500, padding: "2px 6px", borderRadius: "3px",
                          background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                          fontFamily: FONT_BODY, flexShrink: 0,
                        }}>{lbl.text}</span>
                        <span style={{ fontSize: "12px", color: COLOR_INK, fontFamily: FONT_BODY }}>
                          {brand.status === "MANUAL_VERIFIED" && brand.name
                            ? brand.name
                            : `${CATEGORY_KR[brand.category] ?? brand.category} 후보`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "#9ca3af", fontFamily: FONT_BODY, margin: 0 }}>
                  {sc?.target ?? "발굴 대기"}
                </p>
              )}
              {sc?.target && targets.length === 0 && (
                <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: "8px 0 0", lineHeight: 1.55 }}>
                  목표 구성 · {sc.target}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. 4-WEEK FLOW — 도록 톤 ── */}
        <div style={{ ...divider }}>
          <p style={{ ...overlineStyle, marginBottom: "20px" }}>4-WEEK FLOW</p>
          <div>
            {weekly.map((w, i) => (
              <div
                key={i}
                style={{
                  display: "grid", gridTemplateColumns: "5.5rem 1fr",
                  gap: "2rem", alignItems: "baseline",
                  paddingTop: i > 0 ? "16px" : "0",
                  paddingBottom: "16px",
                  borderBottom: i < weekly.length - 1
                    ? "0.5px solid rgba(17,17,17,0.1)"
                    : "none",
                }}
              >
                <span style={{
                  fontFamily: FONT_SERIF, fontSize: "13px", fontWeight: 500,
                  color: COLOR_INK, letterSpacing: "-0.01em",
                }}>
                  {w.label}
                </span>
                <p style={{
                  fontFamily: FONT_BODY, fontSize: "13px", color: COLOR_INK,
                  margin: 0, lineHeight: 1.7,
                }}>
                  {w.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. 정산 구조 개요 — 도록 톤 ── */}
        <div style={{ ...divider }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <p style={{ ...overlineStyle, margin: 0 }}>정산 구조 개요</p>
            <span style={{
              fontSize: "9px", fontWeight: 500,
              padding: "2px 8px", borderRadius: "4px",
              background: "#fef9c3", color: "#92400e",
              border: "1px solid #fde68a",
              fontFamily: FONT_BODY, letterSpacing: "0.04em",
            }}>
              파일럿 후 협의
            </span>
          </div>
          {/* 카드 2개 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            {([
              { label: "운영 기간",  value: "4주",               sub: "일요일 ~ 일요일" },
              { label: "입점 규모",  value: "앵커 1 + 파트너 5–6팀", sub: "" },
            ] as { label: string; value: string; sub: string }[]).map(c => (
              <div key={c.label} style={{
                border: "0.5px solid rgba(17,17,17,0.15)",
                borderRadius: "6px", padding: "16px 20px",
              }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: "11px", color: "#9ca3af", margin: "0 0 6px" }}>{c.label}</p>
                <p style={{
                  fontFamily: FONT_SERIF, fontSize: "18px", fontWeight: 400,
                  color: COLOR_INK, margin: 0, letterSpacing: "-0.01em",
                }}>{c.value}</p>
                {c.sub && <p style={{ fontFamily: FONT_BODY, fontSize: "11px", color: COLOR_SUB, margin: "3px 0 0" }}>{c.sub}</p>}
              </div>
            ))}
          </div>
          {/* 수익원 4개 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "16px" }}>
            {([
              { n: 1, label: "입점 수수료",     note: "" },
              { n: 2, label: "야간 개장 입장료", note: "이벤트 주" },
              { n: 3, label: "F&B 완제품 수수료", note: "" },
              { n: 4, label: "유료 체험 클래스", note: "" },
            ] as { n: number; label: string; note: string }[]).map(r => (
              <div key={r.n} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: "10px", color: "#bdbdbd", minWidth: "40px" }}>
                  수익원 {r.n}
                </span>
                <span style={{ fontFamily: FONT_BODY, fontSize: "13px", color: COLOR_INK }}>{r.label}</span>
                {r.note && (
                  <span style={{ fontFamily: FONT_BODY, fontSize: "10px", color: "#9ca3af" }}>— {r.note}</span>
                )}
              </div>
            ))}
          </div>
          <p style={{
            fontFamily: FONT_SERIF, fontSize: "11px",
            fontStyle: "italic", color: "#9ca3af", margin: 0,
          }}>
            * 조정 가능한 기준 안
          </p>
        </div>

        {/* ── 6. KILLER SCENE ── */}
        <div style={{ ...divider }}>
          <div style={{ borderRadius: "6px", padding: "20px 24px", background: COLOR_INK }}>
            <p style={{ ...overlineStyle, color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
              KILLER SCENE ★
            </p>
            <p style={{
              fontFamily: FONT_BODY, fontSize: "14px", fontWeight: 500,
              color: "#fff", margin: 0, lineHeight: 1.65,
            }}>
              {sc?.killer ?? "—"}
            </p>
          </div>
        </div>

        {/* ── Discover CTA ── */}
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => {
              onNavigate("discover", {
                filter: { category: "all", dong: filter.dong, season: mSeason },
              });
            }}
            style={{
              width: "100%", padding: "10px 0",
              border: `1px solid ${COLOR_RULE}`, borderRadius: "6px",
              background: "#fff", cursor: "pointer",
              fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY,
              letterSpacing: "0.06em",
            }}
          >
            DISCOVER 후보 발굴 →
          </button>
        </div>

      </div>
    );
  }

  // ── 캘린더 그리드 뷰 ──────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

        {/* ══ 왼쪽 사이드바 ══ */}
        <div style={{ width: "220px", flexShrink: 0, paddingTop: "4px" }}>

          {/* CALENDAR 오버라인 */}
          <p style={{ ...overlineStyle, marginBottom: "12px" }}>CALENDAR</p>

          {/* 영문 세리프 대형 제목 */}
          <h1 style={{
            fontSize: "clamp(18px, 1.8vw, 24px)", fontWeight: 700, color: COLOR_INK,
            fontFamily: FONT_SERIF, letterSpacing: "-0.02em",
            lineHeight: 1.1, marginBottom: "4px",
          }}>
            A Year in This Space
          </h1>
          {/* 한글 보조 */}
          <p style={{
            fontSize: "12px", color: COLOR_SUB,
            fontFamily: FONT_BODY, lineHeight: 1, marginBottom: "12px",
          }}>
            내 공간의 1년.
          </p>

          {/* 본문 설명 (한글 유지) */}
          <p style={{
            fontSize: "12px", color: COLOR_SUB,
            fontFamily: FONT_BODY, lineHeight: 1.75, margin: 0,
          }}>
            헤드라이너가 사람을 모으고,<br />
            파트너가 수익을 만든다.<br />
            조건 바꾸면 배치가 바뀐다.
          </p>

          {/* CATEGORY 필터 */}
          <div style={{ marginTop: "24px" }}>
            <p style={{ ...overlineStyle, marginBottom: "10px" }}>CATEGORY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {sidebarCats.map(cat => {
                const isActive = filter.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onFilterChange({
                      ...filter,
                      category: isActive ? "all" : cat.id,
                    })}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "7px 10px", borderRadius: "6px",
                      border: "none", cursor: "pointer", textAlign: "left",
                      background: isActive ? COLOR_INK : "transparent",
                      transition: "background 0.12s",
                      width: "100%",
                    }}
                  >
                    <p style={{
                      fontSize: "12px", fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#fff" : COLOR_INK,
                      fontFamily: FONT_BODY, margin: 0, lineHeight: 1,
                    }}>
                      {cat.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: "1px", background: COLOR_RULE, margin: "16px 0" }} />
          <DemoBadge note="앵커는 큐레이션 방향 (섭외 확정 아님). 타깃은 특성 기반 익명 추천." />
        </div>

        {/* ══ 오른쪽 캘린더 본체 ══ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* 시즌 필터 — 영문 */}
          <div style={{
            display: "flex", gap: "6px", marginBottom: "24px",
            flexWrap: "wrap", alignItems: "center",
          }}>
            {(["all","spring","summer","fall","winter"] as const).map(s => (
              <button
                key={s}
                onClick={() => onFilterChange({ ...filter, season: s })}
                style={{
                  padding: "5px 14px", borderRadius: "20px",
                  border: `1px solid ${filter.season === s ? COLOR_INK : COLOR_RULE}`,
                  background: filter.season === s ? COLOR_INK : "#fff",
                  color: filter.season === s ? "#fff" : COLOR_SUB,
                  fontSize: "12px", fontWeight: filter.season === s ? 600 : 400,
                  fontFamily: FONT_BODY, cursor: "pointer",
                  letterSpacing: "0.06em",
                  transition: "all 0.12s",
                }}
              >
                {s === "all" ? "ALL" : SEASON_EN[s]}
              </button>
            ))}
            {loading && (
              <span style={{ fontSize: "11px", color: COLOR_SUB, fontFamily: FONT_BODY }}>
                재배치 중…
              </span>
            )}
          </div>

          {/* ── 미배정 후보 대기열 ── */}
          {sessionCounts && Object.keys(sessionCounts).length > 0 && (
            <div style={{
              marginBottom: "28px", padding: "16px 20px",
              borderRadius: "8px", border: "1px dashed #d1d5db",
              background: "#fafafa",
            }}>
              <p style={{ ...overlineStyle, marginBottom: "10px" }}>
                미배정 후보 대기열 · MATCH SESSION
              </p>
              <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, marginBottom: "12px" }}>
                아래 후보는 AI 1차 분류 결과입니다. Discover → "게이트 A 등록" 후 해당 시즌 월 칸에 확정 표시됩니다.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {Object.entries(sessionCounts).map(([cat, count]) => {
                  const style = SESSION_CAT_STYLE[cat] ?? SESSION_CAT_STYLE["기타"];
                  return (
                    <div key={cat} style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "5px 12px", borderRadius: "20px",
                      border: `1px dashed ${style.border}`,
                      background: style.bg,
                    }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: style.color, fontFamily: FONT_BODY }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: "11px", color: style.color, opacity: 0.8, fontFamily: FONT_BODY }}>
                        {count}건
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3열 대형 카드 그리드 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
          }}>
            {visible.map((month: number) => {
              const slots   = getBrandsForMonth(month);
              const targets = slots.filter(s => s.role === "target");
              const mSeason = MONTH_SEASON[month];

              return (
                <div
                  key={month}
                  onClick={() => handleCellClick(month)}
                  style={{
                    cursor: "pointer",
                    opacity: 1,
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* ── 컬러필드 (4/3, 불투명 시즌 배경, 좌하단 영문 세리프) ── */}
                  <div style={{
                    aspectRatio: "4 / 3",
                    backgroundColor: SEASON_BG[mSeason],
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: "4px 4px 0 0",
                  }}>
                    <div style={{ position: "absolute", left: "20px", bottom: "20px" }}>
                      {/* 오버라인 */}
                      <p style={{
                        ...overlineStyle,
                        color: "rgba(17,17,17,0.4)",
                        marginBottom: "6px",
                      }}>
                        HEADLINER · {String(month).padStart(2, "0")}
                      </p>
                      {/* 영문 세리프 대형 월 제목 */}
                      <p style={{
                        fontFamily: FONT_SERIF,
                        fontSize: "clamp(32px, 3.5vw, 48px)",
                        fontWeight: 700, color: COLOR_INK,
                        lineHeight: 1, margin: 0,
                        letterSpacing: "-0.02em",
                      }}>
                        {MONTH_EN[month - 1]}
                      </p>
                      {/* 한글 보조 */}
                      <p style={{
                        fontFamily: FONT_BODY,
                        fontSize: "11px", color: "rgba(17,17,17,0.45)",
                        margin: "5px 0 0", letterSpacing: "0.02em",
                      }}>
                        {MONTH_KR[month - 1]}
                      </p>
                      {/* 시즌 라벨 (영문) */}
                      <p style={{
                        fontFamily: FONT_BODY,
                        fontSize: "10px", fontWeight: 500,
                        color: "rgba(17,17,17,0.35)",
                        margin: "4px 0 0", letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}>
                        {SEASON_EN[mSeason]}
                      </p>
                    </div>
                  </div>

                  {/* ── 흰 텍스트 영역 ── */}
                  <div style={{
                    background: "#fff",
                    border: `1px solid ${COLOR_RULE}`,
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    padding: "16px 20px 18px",
                  }}>
                    {/* HEADLINER 오버라인 — 전시 방향 텍스트만, 브랜드 바인딩 없음 */}
                    <p style={{ ...overlineStyle, marginBottom: "6px" }}>
                      {loading ? "재배치 중…" : "HEADLINER"}
                    </p>

                    {/* 타깃 파트너 (4존: 대기·충진 라벨 포함) */}
                    {targets.length > 0 && (
                      <div style={{
                        display: "flex", flexDirection: "column", gap: "4px",
                        marginTop: "4px", paddingTop: "8px",
                        borderTop: "1px solid #f3f4f6",
                      }}>
                        {targets.map(({ brand }) => {
                          const lbl = zoneLabel(brand);
                          const showName = brand.status === "MANUAL_VERIFIED" && brand.name;
                          return (
                            <div key={brand.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{
                                fontSize: "8px", fontWeight: 600, padding: "1px 5px", borderRadius: "3px",
                                background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                                fontFamily: FONT_BODY, flexShrink: 0,
                              }}>
                                {lbl.text}
                              </span>
                              <span style={{ fontSize: "12px", color: showName ? COLOR_INK : COLOR_SUB, fontWeight: showName ? 600 : 400, fontFamily: FONT_BODY, lineHeight: 1 }}>
                                {showName ? brand.name : `${CATEGORY_KR[brand.category] ?? brand.category} 후보`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 세션 후보 (미확정 · 점선 구분) — 현재 달 칸에 표시 */}
                    {month === (new Date().getMonth() + 1) && sessionCounts && Object.keys(sessionCounts).length > 0 && (
                      <div style={{
                        marginTop: "10px", paddingTop: "8px",
                        borderTop: "1px dashed #d1d5db",
                      }}>
                        <p style={{ ...overlineStyle, fontSize: "9px", marginBottom: "5px", color: "#9ca3af" }}>
                          MATCH SESSION · 미확정
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {Object.entries(sessionCounts).map(([cat, count]) => {
                            const style = SESSION_CAT_STYLE[cat] ?? SESSION_CAT_STYLE["기타"];
                            return (
                              <div key={cat} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <span style={{
                                  fontSize: "8px", fontWeight: 600, padding: "1px 5px", borderRadius: "3px",
                                  background: style.bg, color: style.color,
                                  border: `1px dashed ${style.border}`,
                                  fontFamily: FONT_BODY,
                                }}>
                                  {style.label}
                                </span>
                                <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY }}>
                                  {count}건 · 미등록
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* DISCOVER → */}
                    <div style={{ marginTop: "12px", textAlign: "right" }}>
                      <span style={{
                        fontSize: "11px", color: "#d1d5db",
                        fontFamily: FONT_BODY, letterSpacing: "0.06em",
                      }}>
                        DISCOVER →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
