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

interface CalBrand {
  id: string;
  category: string;
  season: string;
  lx: number;
  ly: number;
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

export default function CalendarTab({ filter, onNavigate, onFilterChange }: CalendarTabProps) {
  const [rawBrands, setRawBrands]       = useState<CalBrand[]>([]);
  const [brands, setBrands]             = useState<CalBrand[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    fetch("/api/mezzanine/brands")
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d.brands)) return;
        const mapped = d.brands.map((b: Record<string, unknown>) => ({
          id:             String(b.id             ?? ""),
          category:       String(b.category       ?? ""),
          season:         String(b.season         ?? "all"),
          lx:             Number(b.matrix_x)      || 50,
          ly:             Number(b.matrix_y)      || 50,
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

  function getBrandsForMonth(month: number): { brand: CalBrand; role: "anchor" | "target" }[] {
    const mSeason = MONTH_SEASON[month];
    const pool    = brands.filter(b => b.season === "all" || b.season === mSeason);
    if (pool.length === 0) return [];
    const sorted  = [...pool].sort((a, b) => b.ly - a.ly);
    const start   = ((month - 1) * 2) % sorted.length;
    const rotated = [...sorted.slice(start), ...sorted.slice(0, start)].slice(0, 3);
    return rotated.map((b, i) => ({ brand: b, role: i === 0 ? "anchor" : "target" as const }));
  }

  function handleCellClick(month: number) {
    const slots   = getBrandsForMonth(month);
    const anchor  = slots.find(s => s.role === "anchor");
    const mSeason = MONTH_SEASON[month];
    onNavigate("discover", {
      filter: {
        category: anchor ? anchor.brand.category : "all",
        dong:     filter.dong,
        season:   mSeason,
      },
    });
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

          {/* 3열 대형 카드 그리드 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
          }}>
            {visible.map(month => {
              const slots   = getBrandsForMonth(month);
              const anchor  = slots.find(s => s.role === "anchor");
              const targets = slots.filter(s => s.role === "target");
              const mSeason = MONTH_SEASON[month];
              const dimmed  = filter.category !== "all" && !!anchor &&
                              anchor.brand.category !== filter.category;

              return (
                <div
                  key={month}
                  onClick={() => handleCellClick(month)}
                  style={{
                    cursor: "pointer",
                    opacity: dimmed ? 0.3 : 1,
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (dimmed) return;
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
                    {/* 헤드라이너 역할 오버라인 */}
                    <p style={{ ...overlineStyle, marginBottom: "6px" }}>
                      {anchor
                        ? `${CATEGORY_KR[anchor.brand.category] ?? anchor.brand.category} · HEADLINER`
                        : loading ? "재배치 중…" : "발굴 대기"}
                    </p>

                    {/* 앵커 상태 라벨 */}
                    {anchor && (() => {
                      const lbl = zoneLabel(anchor.brand);
                      return (
                        <span style={{
                          display: "inline-block", fontSize: "9px", fontWeight: 700,
                          padding: "2px 7px", borderRadius: "4px",
                          background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                          fontFamily: FONT_BODY, marginBottom: "6px", letterSpacing: "0.04em",
                        }}>
                          {lbl.text}
                        </span>
                      );
                    })()}

                    {/* 타깃 파트너 (4존: 대기·충진 라벨 포함) */}
                    {targets.length > 0 && (
                      <div style={{
                        display: "flex", flexDirection: "column", gap: "4px",
                        marginTop: "4px", paddingTop: "8px",
                        borderTop: "1px solid #f3f4f6",
                      }}>
                        {targets.map(({ brand }) => {
                          const lbl = zoneLabel(brand);
                          return (
                            <div key={brand.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{
                                fontSize: "8px", fontWeight: 600, padding: "1px 5px", borderRadius: "3px",
                                background: lbl.bg, color: lbl.color, border: `1px solid ${lbl.border}`,
                                fontFamily: FONT_BODY, flexShrink: 0,
                              }}>
                                {lbl.text}
                              </span>
                              <span style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1 }}>
                                {CATEGORY_KR[brand.category] ?? brand.category} 후보
                              </span>
                            </div>
                          );
                        })}
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
