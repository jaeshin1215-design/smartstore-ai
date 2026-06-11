"use client";

import { useState, useEffect } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import {
  FONT_SERIF, FONT_BODY,
  COLOR_INK, COLOR_SUB, COLOR_RULE,
  TEXT_CAPTION_SIZE, TRACKING_OVERLINE,
} from "@/lib/tokens";
import { CATEGORIES } from "@/lib/categories";

const SAGE = "#dfe5da";       // Calendar spring / pontos 히어로 좌측 컬러필드
const LIGHT_BG = "#fafaf8";   // 우측 연한 면

const DONGS = [
  { id: "all", label: "ALL",    note: "" },
  { id: "A",   label: "A ZONE", note: "B1F 앵커 · 1F~루프탑 정산" },
  { id: "B",   label: "B ZONE", note: "정산 후보" },
  { id: "C",   label: "C ZONE", note: "상시 입점 · 콜라보" },
];

interface BrandEntry {
  id: string;
  name: string;
  instagram_handle: string;
  category: string;
  dong: string;
  matrix_x: number;
  matrix_y: number;
  created_at: string;
}

export interface Filter {
  category: string;
  dong: string;
  season: string;
}

interface Props {
  filter?: Filter;
  onFilterChange?: (filter: Filter) => void;
  onBrandAdded?: () => void;
}

export default function SetupTab({ filter: externalFilter, onFilterChange, onBrandAdded }: Props) {
  const [localFilter, setLocalFilter] = useState<Filter>(
    externalFilter ?? { category: "all", dong: "all", season: "all" }
  );

  const [name,         setName]         = useState("");
  const [handle,       setHandle]       = useState("");
  const [catInput,     setCatInput]     = useState("lifestyle");
  const [seasonInput,  setSeasonInput]  = useState("all");
  const [followers,    setFollowers]    = useState("");
  const [popupCount,   setPopupCount]   = useState("");
  const [region,       setRegion]       = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [brands, setBrands] = useState<BrandEntry[]>([]);

  const loadBrands = async () => {
    try {
      const r = await fetch("/api/mezzanine/brands?category=all&dong=all&season=all");
      const j = await r.json() as { brands?: BrandEntry[] };
      setBrands(j.brands ?? []);
    } catch { /* 무시 */ }
  };

  useEffect(() => { loadBrands(); }, []);

  const handleApplyFilter = () => onFilterChange?.(localFilter);

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/mezzanine/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          instagram_handle: handle.trim(),
          category: catInput,
          followers: Number(followers) || 0,
          popup_count: Number(popupCount) || 0,
          region: region.trim(),
          season: seasonInput,
          source_type: "MANUAL",
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; dong?: string; matrix_x?: number; matrix_y?: number };
      if (json.ok) {
        setSubmitResult({
          ok: true,
          msg: `"${name.trim()}" 등록 완료 · 동: ${json.dong ?? "TBD"} · 적합도: ${json.matrix_x} · 집객력: ${json.matrix_y}`,
        });
        setName(""); setHandle(""); setFollowers(""); setPopupCount(""); setRegion("");
        await loadBrands();
        onBrandAdded?.();
      } else {
        setSubmitResult({ ok: false, msg: json.error ?? "등록 실패" });
      }
    } catch (e) {
      setSubmitResult({ ok: false, msg: String(e) });
    }
    setSubmitting(false);
  };

  const overlineBase: React.CSSProperties = {
    fontSize: TEXT_CAPTION_SIZE, fontWeight: 500,
    textTransform: "uppercase", letterSpacing: TRACKING_OVERLINE,
    fontFamily: FONT_BODY, margin: 0,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", fontSize: "13px", padding: "9px 12px",
    borderRadius: "7px", border: `1px solid ${COLOR_RULE}`,
    background: "#fff", outline: "none", fontFamily: FONT_BODY,
    color: "#1a1a1a", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "#64676b",
    margin: "0 0 5px 0", fontFamily: FONT_BODY,
  };

  const sidebarCats = CATEGORIES.filter(c => c.id !== "all");

  return (
    <div style={{ width: "100%", fontFamily: FONT_BODY, overflowX: "hidden" }}>

      {/* ══════════════════════════════════════════════
          FULL-BLEED 2-COL: SEGMENT (세이지) / BRAND REGISTRY (연한 흰)
          margin: 0 -24px → parent padding 24px 상쇄, 화면 끝까지
      ══════════════════════════════════════════════ */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        margin: "0 -24px",
      }}>

        {/* ── LEFT: SEGMENT — #dfe5da 세이지 색면 ── */}
        <div style={{ background: SAGE, padding: "44px 40px 52px 24px" }}>

          {/* SETUP 미니 오버라인 */}
          <p style={{ ...overlineBase, color: "rgba(17,17,17,0.38)", marginBottom: "20px", fontSize: "11px" }}>
            SETUP
          </p>

          {/* SEGMENT 오버라인 */}
          <p style={{ ...overlineBase, color: "rgba(17,17,17,0.5)", marginBottom: "8px" }}>
            SEGMENT
          </p>

          {/* 세리프 대형 헤드라인 */}
          <h1 style={{
            fontFamily: FONT_SERIF,
            fontSize: "clamp(28px, 3vw, 44px)",
            fontWeight: 700, color: COLOR_INK,
            letterSpacing: "-0.02em", lineHeight: 1.05,
            margin: "0 0 6px 0",
          }}>
            Who · Where · When
          </h1>

          {/* 한글 보조 */}
          <p style={{ fontSize: "13px", color: "rgba(17,17,17,0.55)", fontFamily: FONT_BODY, lineHeight: 1, margin: "0 0 6px 0" }}>
            누구 · 어디 · 언제.
          </p>
          <p style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", fontFamily: FONT_BODY, lineHeight: 1.7, margin: "0 0 28px 0" }}>
            검증된 성장 곡선 + 오프라인 미충족 수요 — 두 조건을 가진 브랜드를 정밀 발굴합니다.
          </p>

          {/* ── CATEGORY ── */}
          <div style={{ height: "1px", background: "rgba(17,17,17,0.12)", marginBottom: "18px" }} />
          <p style={{ ...overlineBase, color: "rgba(17,17,17,0.45)", marginBottom: "10px" }}>CATEGORY</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "20px" }}>
            {sidebarCats.map(cat => {
              const isActive = localFilter.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setLocalFilter(f => ({ ...f, category: isActive ? "all" : cat.id }))}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "7px 10px", borderRadius: "6px",
                    border: "none", cursor: "pointer", textAlign: "left",
                    background: isActive ? COLOR_INK : "rgba(17,17,17,0.06)",
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

          {/* ── ZONE ── */}
          <div style={{ height: "1px", background: "rgba(17,17,17,0.12)", marginBottom: "18px" }} />
          <p style={{ ...overlineBase, color: "rgba(17,17,17,0.45)", marginBottom: "10px" }}>ZONE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "20px" }}>
            {DONGS.map(d => {
              const isActive = localFilter.dong === d.id;
              return (
                <button key={d.id} onClick={() => setLocalFilter(f => ({ ...f, dong: d.id }))}
                  style={{
                    padding: "7px 10px", borderRadius: "6px", cursor: "pointer",
                    border: "none",
                    background: isActive ? COLOR_INK : "rgba(17,17,17,0.06)",
                    fontSize: "12px", fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#fff" : COLOR_INK,
                    textAlign: "left", fontFamily: FONT_BODY, width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                  <span>{d.label}</span>
                  {d.note && (
                    <span style={{ fontSize: "9px", fontWeight: 700, color: isActive ? "rgba(255,255,255,0.55)" : "rgba(17,17,17,0.35)", letterSpacing: "0.04em" }}>{d.note}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── SEASON ── */}
          <div style={{ height: "1px", background: "rgba(17,17,17,0.12)", marginBottom: "18px" }} />
          <p style={{ ...overlineBase, color: "rgba(17,17,17,0.45)", marginBottom: "10px" }}>SEASON</p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "28px" }}>
            {(["all","spring","summer","fall","winter"] as const).map(s => {
              const isActive = localFilter.season === s;
              return (
                <button
                  key={s}
                  onClick={() => setLocalFilter(f => ({ ...f, season: s }))}
                  style={{
                    padding: "5px 12px", borderRadius: "20px",
                    border: `1px solid ${isActive ? COLOR_INK : "rgba(17,17,17,0.2)"}`,
                    background: isActive ? COLOR_INK : "rgba(17,17,17,0.06)",
                    color: isActive ? "#fff" : COLOR_INK,
                    fontSize: "11px", fontWeight: isActive ? 600 : 400,
                    fontFamily: FONT_BODY, cursor: "pointer",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s === "all" ? "ALL" : s.toUpperCase()}
                </button>
              );
            })}
          </div>

          <button onClick={handleApplyFilter} style={{
            width: "100%", padding: "13px", borderRadius: "8px",
            background: COLOR_INK, color: "#fff", border: "none",
            fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY,
          }}>
            조건 적용 →
          </button>
        </div>

        {/* ── RIGHT: BRAND REGISTRY — 연한 흰 면 ── */}
        <div style={{ background: LIGHT_BG, padding: "44px 24px 52px 40px" }}>

          <p style={{ ...overlineBase, color: "#9ca3af", marginBottom: "8px" }}>
            BRAND REGISTRY
          </p>
          <h2 style={{
            fontFamily: FONT_SERIF,
            fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, color: COLOR_INK,
            letterSpacing: "-0.02em", lineHeight: 1.05,
            margin: "0 0 6px 0",
          }}>
            Find It. Analyze It.
          </h2>
          <p style={{ fontSize: "13px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1, margin: "0 0 20px 0" }}>
            찾고 분석한다.
          </p>

          <DemoBadge note="실존 브랜드만 입력. AI가 공간 적합도·배치 동을 자동 분석합니다." />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px", marginBottom: "12px" }}>
            <div>
              <p style={labelStyle}>브랜드명 *</p>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="예) 닥터웰스" maxLength={50} style={inputStyle} />
            </div>
            <div>
              <p style={labelStyle}>인스타 @계정</p>
              <input value={handle} onChange={e => setHandle(e.target.value)}
                placeholder="@doctor.wells" maxLength={60} style={inputStyle} />
            </div>
            <div>
              <p style={labelStyle}>카테고리</p>
              <select value={catInput} onChange={e => setCatInput(e.target.value)} style={inputStyle}>
                {CATEGORIES.filter(c => c.id !== "all").map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p style={labelStyle}>시즌</p>
              <select value={seasonInput} onChange={e => setSeasonInput(e.target.value)} style={inputStyle}>
                {[
                  { id: "all",    label: "ALL"    },
                  { id: "spring", label: "SPRING" },
                  { id: "summer", label: "SUMMER" },
                  { id: "fall",   label: "FALL"   },
                  { id: "winter", label: "WINTER" },
                ].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <p style={labelStyle}>팔로워 수</p>
              <input type="number" value={followers} onChange={e => setFollowers(e.target.value)}
                placeholder="예) 12000" min={0} style={inputStyle} />
            </div>
            <div>
              <p style={labelStyle}>팝업이력 (횟수)</p>
              <input type="number" value={popupCount} onChange={e => setPopupCount(e.target.value)}
                placeholder="예) 3" min={0} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={labelStyle}>활동 지역</p>
            <input value={region} onChange={e => setRegion(e.target.value)}
              placeholder="예) 서울 서대문구, 마포구" style={inputStyle} />
          </div>

          <button onClick={handleSubmit} disabled={submitting || !name.trim()} style={{
            width: "100%", padding: "13px", borderRadius: "8px",
            background: submitting || !name.trim() ? "#d1d5db" : COLOR_INK,
            color: "#fff", border: "none", fontSize: "13px", fontWeight: 700,
            cursor: submitting || !name.trim() ? "not-allowed" : "pointer",
            fontFamily: FONT_BODY,
          }}>
            {submitting ? "AI 분석 중..." : "등록 + AI 분석 →"}
          </button>

          {submitResult && (
            <div style={{
              marginTop: "12px", padding: "10px 14px", borderRadius: "7px",
              background: submitResult.ok ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${submitResult.ok ? "#86efac" : "#fca5a5"}`,
              fontSize: "12px", color: submitResult.ok ? "#15803d" : "#dc2626",
              lineHeight: 1.55, fontFamily: FONT_BODY,
            }}>
              {submitResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* ── 전폭 구분선 ── */}
      <div style={{ margin: "0 -24px", height: "1px", background: COLOR_RULE }} />

      {/* ══════════════════════════════════════════════
          FULL-BLEED 검정 인용 블록 (pontos "어떻게 작동하나" 검정 카드)
      ══════════════════════════════════════════════ */}
      <div style={{ background: COLOR_INK, margin: "0 -24px", padding: "56px 24px" }}>
        {/* 내부 콘텐츠 — 최대 폭 제한 없이 패딩만 */}
        <p style={{
          ...overlineBase,
          color: "rgba(255,255,255,0.4)",
          marginBottom: "20px",
        }}>
          WHY THIS WORKS
        </p>
        <h2 style={{
          fontFamily: FONT_SERIF,
          fontSize: "clamp(28px, 3.5vw, 52px)",
          fontWeight: 700, color: "#fff",
          letterSpacing: "-0.02em", lineHeight: 1.05,
          margin: "0 0 32px 0",
          maxWidth: "640px",
        }}>
          "집객 자체가 광고다."
        </h2>
        <div style={{ width: "40px", height: "1px", background: "rgba(255,255,255,0.25)", marginBottom: "20px" }} />
        <p style={{
          fontSize: "13px", color: "rgba(255,255,255,0.55)",
          fontFamily: FONT_BODY, lineHeight: 1, margin: "0 0 6px 0",
        }}>
          브랜드가 모이면 공간이 바뀐다. 공간이 바뀌면 브랜드가 팔린다.
        </p>
        <span style={{
          fontSize: "12px", color: "rgba(255,255,255,0.4)",
          fontFamily: FONT_BODY, letterSpacing: "0.04em", cursor: "default",
        }}>
          작동 방식 보기 →
        </span>
      </div>

      {/* ── 전폭 구분선 ── */}
      <div style={{ margin: "0 -24px", height: "1px", background: COLOR_RULE }} />

      {/* ══════════════════════════════════════════════
          PIPELINE
      ══════════════════════════════════════════════ */}
      {brands.length > 0 && (
        <div style={{ paddingTop: "44px", paddingBottom: "48px" }}>
          <p style={{ ...overlineBase, color: "#9ca3af", marginBottom: "8px" }}>PIPELINE</p>
          <h2 style={{
            fontFamily: FONT_SERIF,
            fontSize: "clamp(22px, 2.5vw, 36px)",
            fontWeight: 700, color: COLOR_INK,
            letterSpacing: "-0.02em", lineHeight: 1.05,
            margin: "0 0 4px 0",
          }}>
            Ready for Diagnosis
          </h2>
          <p style={{ fontSize: "12px", color: COLOR_SUB, fontFamily: FONT_BODY, lineHeight: 1, marginBottom: "24px" }}>
            후보 {brands.length}개 · 매트릭스 배치 준비 완료
          </p>

          {/* 헤더 행 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 110px 72px 110px",
            gap: "0 16px",
            padding: "0 0 8px 0",
            borderBottom: `1px solid ${COLOR_RULE}`,
          }}>
            {["브랜드", "카테고리", "동", "적합 · 집객"].map(h => (
              <span key={h} style={{
                fontSize: "10px", fontWeight: 600, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.07em",
                fontFamily: FONT_BODY,
              }}>{h}</span>
            ))}
          </div>

          {brands.map(b => (
            <div key={b.id} style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 110px 72px 110px",
              gap: "0 16px",
              alignItems: "center",
              padding: "11px 0",
              borderBottom: `1px solid ${COLOR_RULE}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <span style={{
                  fontSize: "13px", fontWeight: 600, color: COLOR_INK,
                  fontFamily: FONT_BODY, display: "block",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{b.name}</span>
                {b.instagram_handle && (
                  <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: FONT_BODY }}>{b.instagram_handle}</span>
                )}
              </div>
              <span style={{ fontSize: "11px", fontWeight: 500, color: COLOR_INK, fontFamily: FONT_BODY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.category}
              </span>
              <span style={{ fontSize: "11px", color: b.dong !== "TBD" ? "#15803d" : "#9ca3af", fontFamily: FONT_BODY }}>
                {b.dong !== "TBD" ? `${b.dong}동` : "—"}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 500, color: COLOR_SUB, fontFamily: FONT_BODY }}>
                {b.matrix_x} · {b.matrix_y}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          FULL-BLEED 하단 검정 밴드 (footer 바로 위)
          margin-bottom: -48px → parent bottom padding 상쇄, footer와 연결
      ══════════════════════════════════════════════ */}
      <div style={{
        background: COLOR_INK,
        margin: `0 -24px ${brands.length > 0 ? "-48px" : "-48px"}`,
        padding: "32px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
      }}>
        <p style={{
          fontFamily: FONT_SERIF,
          fontSize: "clamp(16px, 2vw, 24px)",
          fontWeight: 700, color: "#fff",
          letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0,
        }}>
          Aiges Pontos — First in concrete. Now in code.
        </p>
        <span style={{
          fontSize: "12px", color: "rgba(255,255,255,0.45)",
          fontFamily: FONT_BODY, letterSpacing: "0.04em",
        }}>
          메자닌 북가좌 · AI 입점 매칭 데모 · 2026
        </span>
      </div>
    </div>
  );
}
