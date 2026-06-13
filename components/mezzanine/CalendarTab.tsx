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

  // ── 해부도 뷰 (월 클릭 시 렌더) ──────────────────────────────────────────
  if (selectedMonth !== null) {
    const month    = selectedMonth;
    const sc       = MONTH_SCENARIOS[month];
    const mSeason  = MONTH_SEASON[month];
    const weekly   = getWeekly(month);
    const slots    = getBrandsForMonth(month);
    const fbBrands = slots.filter(s => s.role === "fb");
    const targets  = slots.filter(s => s.role === "target");
    const colorBg  = SEASON_BG[mSeason];

    return (
      <div style={{ width: "100%" }}>

        {/* ── 뒤로가기 + 헤더 ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <button
            onClick={() => setSelectedMonth(null)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              border: `1px solid ${COLOR_RULE}`, borderRadius: "6px",
              background: "#fff", cursor: "pointer",
              padding: "6px 14px", fontFamily: FONT_BODY,
              fontSize: "12px", color: COLOR_SUB,
            }}
          >
            ← 캘린더로
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
              <p style={{ ...overlineStyle, margin: 0 }}>
                {MONTH_EN[month - 1]} · {SEASON_EN[mSeason]} · 운영 해부도
              </p>
              <span style={{
                fontSize: "9px", fontWeight: 700,
                padding: "2px 8px", borderRadius: "4px",
                background: "#fef9c3", color: "#92400e",
                border: "1px solid #fde68a",
                fontFamily: FONT_BODY, letterSpacing: "0.04em",
              }}>
                가상 시나리오 · 예시
              </span>
            </div>
            <h2 style={{
              fontFamily: FONT_SERIF, fontSize: "clamp(18px, 2vw, 26px)",
              fontWeight: 700, color: COLOR_INK, letterSpacing: "-0.02em",
              margin: 0, lineHeight: 1.15,
            }}>
              {sc?.theme ?? `${MONTH_KR[month - 1]} 시즌`}
            </h2>
          </div>
        </div>

        {/* ── 컬러 배너 ── */}
        <div style={{
          width: "100%", padding: "28px 36px",
          background: colorBg, borderRadius: "8px",
          marginBottom: "28px",
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ ...overlineStyle, color: "rgba(17,17,17,0.4)", marginBottom: "8px" }}>
              ANCHOR DIRECTION
            </p>
            <p style={{
              fontFamily: FONT_SERIF, fontSize: "clamp(14px, 1.6vw, 20px)",
              fontWeight: 700, color: COLOR_INK, margin: 0, lineHeight: 1.3,
            }}>
              {sc?.anchor ?? "—"}
            </p>
          </div>
          <p style={{
            fontFamily: FONT_SERIF, fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: 700, color: "rgba(17,17,17,0.12)",
            margin: 0, lineHeight: 1, letterSpacing: "-0.03em",
          }}>
            {MONTH_EN[month - 1]}
          </p>
        </div>

        {/* ── 2열 본체 ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "28px", alignItems: "start" }}>

          {/* 왼쪽: 브랜드 구성 + F&B + 킬러씬 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* 앵커 — 전시·문화 방향 텍스트만 (브랜드 바인딩 없음) */}
            <div style={{
              border: `1px solid ${COLOR_RULE}`, borderRadius: "8px",
              padding: "18px 20px", background: "#fff",
            }}>
              <p style={{ ...overlineStyle, marginBottom: "10px" }}>HEADLINER (앵커)</p>
              <p style={{ fontSize: "15px", fontWeight: 700, color: COLOR_INK, fontFamily: FONT_BODY, margin: "0 0 10px", lineHeight: 1.3 }}>
                {sc?.anchor ?? "—"}
              </p>
              <span style={{
                display: "inline-block", fontSize: "9px", fontWeight: 700,
                padding: "2px 8px", borderRadius: "4px",
                background: "#f3f4f6", color: "#6b7280",
                border: "1px solid #d1d5db",
                fontFamily: FONT_BODY,
              }}>
                섭외 미확정
              </span>
            </div>

            {/* 타깃 파트너 */}
            <div style={{
              border: `1px solid ${COLOR_RULE}`, borderRadius: "8px",
              padding: "18px 20px", background: "#fff",
            }}>
              <p style={{ ...overlineStyle, marginBottom: "10px" }}>TARGET PARTNERS</p>
              {targets.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {targets.map(({ brand }) => {
                    const lbl = zoneLabel(brand);
                    return (
                      <div key={brand.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "8px", fontWeight: 600, padding: "2px 6px", borderRadius: "3px",
                          background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                          fontFamily: FONT_BODY, flexShrink: 0,
                        }}>
                          {lbl.text}
                        </span>
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
              {sc?.target && (
                <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: "10px 0 0", lineHeight: 1.5 }}>
                  목표 구성 · {sc.target}
                </p>
              )}
            </div>

            {/* F&B 헤드라이너 */}
            <div style={{
              border: `1px solid ${COLOR_RULE}`, borderRadius: "8px",
              padding: "18px 20px", background: "#fff",
            }}>
              <p style={{ ...overlineStyle, marginBottom: "10px" }}>F&B 헤드라이너 · 완제품</p>
              {fbBrands.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {fbBrands.map(({ brand }) => {
                    const lbl = zoneLabel(brand);
                    return (
                      <div key={brand.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "8px", fontWeight: 600, padding: "2px 6px", borderRadius: "3px",
                          background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                          fontFamily: FONT_BODY, flexShrink: 0,
                        }}>
                          {lbl.text}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: COLOR_INK, fontFamily: FONT_BODY }}>
                          {brand.status === "MANUAL_VERIFIED" && brand.name
                            ? brand.name
                            : `F&B · ${CATEGORY_KR[brand.category] ?? brand.category} 후보`}
                        </span>
                      </div>
                    );
                  })}
                  {sc?.fb && (
                    <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: "4px 0 0", lineHeight: 1.5 }}>
                      {sc.fb}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: COLOR_INK, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.6 }}>
                  {sc?.fb ?? "—"}
                </p>
              )}
            </div>

            {/* 킬러씬 */}
            <div style={{
              border: `1px solid ${COLOR_INK}`, borderRadius: "8px",
              padding: "18px 20px", background: COLOR_INK,
            }}>
              <p style={{ ...overlineStyle, color: "rgba(255,255,255,0.45)", marginBottom: "8px" }}>
                KILLER SCENE ★
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", fontFamily: FONT_BODY, margin: 0, lineHeight: 1.55 }}>
                {sc?.killer ?? "—"}
              </p>
            </div>

            {/* Discover CTA */}
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

          {/* 오른쪽: 주차별 흐름 + 정산구조 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* 주차별 흐름 */}
            <div style={{
              border: `1px solid ${COLOR_RULE}`, borderRadius: "8px",
              padding: "20px 24px", background: "#fff",
            }}>
              <p style={{ ...overlineStyle, marginBottom: "16px" }}>주차별 운영 흐름 · 4-WEEK FLOW</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {weekly.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid", gridTemplateColumns: "100px 1fr",
                      gap: "16px", alignItems: "start",
                      padding: "14px 0",
                      borderBottom: i < weekly.length - 1 ? `1px solid ${COLOR_RULE}` : "none",
                    }}
                  >
                    <div>
                      <span style={{
                        display: "inline-block",
                        fontSize: "10px", fontWeight: 700,
                        padding: "3px 10px", borderRadius: "4px",
                        background: colorBg, color: COLOR_INK,
                        fontFamily: FONT_BODY, letterSpacing: "0.04em",
                      }}>
                        {w.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: COLOR_INK, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.65 }}>
                      {w.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 정산 구조 개요 */}
            <div style={{
              border: `1px solid ${COLOR_RULE}`, borderRadius: "8px",
              padding: "20px 24px", background: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <p style={{ ...overlineStyle, margin: 0 }}>정산 구조 개요</p>
                <span style={{
                  fontSize: "9px", fontWeight: 700,
                  padding: "2px 8px", borderRadius: "4px",
                  background: "#fef9c3", color: "#92400e",
                  border: "1px solid #fde68a",
                  fontFamily: FONT_BODY, letterSpacing: "0.04em",
                }}>
                  파일럿 후 협의
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "운영 기간",  value: "4주 (일~일)" },
                  { label: "입점 규모",  value: "앵커 1팀 + 파트너 5~6팀" },
                  { label: "수익원 1",  value: "입점 수수료" },
                  { label: "수익원 2",  value: "야간 개장 입장료 (이벤트 주)" },
                  { label: "수익원 3",  value: "F&B 완제품 수수료" },
                  { label: "수익원 4",  value: "유료 체험 클래스 수입" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                    <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: 0, flexShrink: 0 }}>
                      {row.label}
                    </p>
                    <p style={{ fontSize: "13px", color: COLOR_INK, fontFamily: FONT_BODY, margin: 0, textAlign: "right" }}>
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${COLOR_RULE}` }}>
                <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY, margin: 0, lineHeight: 1.7 }}>
                  * 정산 구조는 운영 방식·계약 조건에 따라 조정 가능한 기준 안입니다.
                </p>
              </div>
            </div>

          </div>
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
