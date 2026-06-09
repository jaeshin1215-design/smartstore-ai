"use client";

import { useState, useEffect } from "react";
import { DemoBadge } from "@/components/DemoBadge";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CATEGORIES = [
  { id: "all",         label: "전체" },
  // ★ 현장 검증 (이 공간 실증)
  { id: "performance", label: "★ 공연·굿즈" },
  { id: "bakery_fb",   label: "★ F&B·베이커리" },
  { id: "wellness",    label: "★ 웰니스" },
  // ⚡ 인바운드 검증 (실제 문의 들어옴)
  { id: "outdoor",     label: "⚡ 캠핑·아웃도어" },
  // ☆ 시장 가설 (서울 시장 근거, 이 현장 미검증)
  { id: "fashion",     label: "☆ 패션" },
  { id: "ip_content",  label: "☆ IP·콘텐츠" },
  { id: "beauty",      label: "☆ 뷰티" },
];

// 동별 운영 모드 (하이브리드 확정)
const DONGS = [
  { id: "all", label: "전체", mode: null as null | "anchor" | "popup" },
  { id: "A",   label: "A동",  mode: "anchor" as const },
  { id: "B",   label: "B동",  mode: "anchor" as const },
  { id: "C",   label: "C동",  mode: "popup"  as const },
];

const SEASONS = [
  { id: "all",    label: "전체" },
  { id: "spring", label: "봄" },
  { id: "summer", label: "여름" },
  { id: "fall",   label: "가을" },
  { id: "winter", label: "겨울" },
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

function FilterBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px", borderRadius: "6px",
        border: `1px solid ${active ? "#3b4fd8" : "#e8eaed"}`,
        background: active ? "#eff6ff" : "#fafafa",
        color: active ? "#1d4ed8" : "#6b7280",
        fontSize: "12px", fontWeight: active ? 600 : 400,
        cursor: "pointer", textAlign: "left" as const, fontFamily: FF,
        width: "100%",
      }}
    >
      {label}
    </button>
  );
}

export default function SetupTab({ filter: externalFilter, onFilterChange, onBrandAdded }: Props) {
  const [localFilter, setLocalFilter] = useState<Filter>(
    externalFilter ?? { category: "all", dong: "all", season: "all" }
  );

  const [name,       setName]       = useState("");
  const [handle,     setHandle]     = useState("");
  const [catInput,   setCatInput]   = useState("lifestyle");
  const [seasonInput,setSeasonInput]= useState("all");
  const [followers,  setFollowers]  = useState("");
  const [popupCount, setPopupCount] = useState("");
  const [region,     setRegion]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);

  /* 등록 목록 */
  const [brands,     setBrands]     = useState<BrandEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const loadBrands = async () => {
    try {
      const r = await fetch("/api/mezzanine/brands?category=all&dong=all&season=all");
      const j = await r.json() as { brands?: BrandEntry[]; total?: number };
      setBrands(j.brands ?? []);
      setTotalCount(j.total ?? 0);
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

  const inputStyle = {
    width: "100%", fontSize: "13px", padding: "9px 12px",
    borderRadius: "7px", border: "1px solid #e8eaed",
    background: "#f9fafb", outline: "none", fontFamily: FF,
    color: "#1a1a1a", boxSizing: "border-box" as const,
  };
  const labelStyle = { fontSize: "11px", fontWeight: 600 as const, color: "#64676b", margin: "0 0 5px 0" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0,720px)", gap: "0 25vw", fontFamily: FF }}>

      {/* ── 좌: 사이드바 ── */}
      <div style={{ background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>
          SPACE INTEL
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>
          브랜드<br />발굴 분류기
        </p>
        <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px", lineHeight: 1.5 }}>
          유명세가 아니라<br />"지금 공간이 아쉬운"<br />브랜드를 거릅니다.
        </p>

        {/* 하이브리드 모델 뱃지 */}
        <div style={{ background: "#eff6ff", border: "1px solid #c7d2fe", borderRadius: "6px", padding: "8px 10px", marginBottom: "12px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#3b4fd8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px 0" }}>하이브리드 모델</p>
          <p style={{ fontSize: "10px", color: "#4338ca", margin: "0 0 2px 0", lineHeight: 1.4 }}>A·B동 앵커 (3~6개월)</p>
          <p style={{ fontSize: "10px", color: "#92400e", margin: 0, lineHeight: 1.4 }}>C동 팝업 (1~2개월)</p>
        </div>

        {[
          "D2C only — 유통 없이 직판",
          "팔로워 5천~2만 (과대·과소 제외)",
          "오프라인 쇼룸 없음 (공간 목마름)",
          "팝업·플리마켓 이력 3~6개월",
          "서북권 밀착 또는 인증샷 파급력",
          "콜라보 마켓 참여 잦음",
        ].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "5px", marginBottom: "7px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#c0c4cc", flexShrink: 0, marginTop: "1px" }}>◆</span>
            <span style={{ fontSize: "11px", color: "#8f9399", lineHeight: 1.45 }}>{f}</span>
          </div>
        ))}

        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e8eaed" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "8px" }}>현황</p>
          <p style={{ fontSize: "11px", color: "#3b4fd8", fontWeight: 700, margin: "0 0 4px 0" }}>
            → {totalCount}개 후보 등록
          </p>
          <p style={{ fontSize: "10px", color: "#6272c4", margin: 0, lineHeight: 1.5 }}>
            Diagnose 매트릭스<br />배치 준비 완료
          </p>
        </div>
      </div>

      {/* ── 우: 메인 ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* 분류기 카드 */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: "10px", padding: "24px 28px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "6px" }}>
            ⚙️ 분류기 — 조건으로 후보를 거른다
          </p>
          <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.65, marginBottom: "20px" }}>
            같은 100개라도 조건을 바꾸면 다른 그룹이 Discover·Diagnose로 흐릅니다.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* 카테고리 */}
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>카테고리</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {CATEGORIES.map(c => (
                  <FilterBtn key={c.id} label={c.label} active={localFilter.category === c.id}
                    onClick={() => setLocalFilter(f => ({ ...f, category: c.id }))} />
                ))}
              </div>
            </div>

            {/* 동 */}
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>동</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {DONGS.map(d => (
                  <button key={d.id} onClick={() => setLocalFilter(f => ({ ...f, dong: d.id }))}
                    style={{
                      padding: "6px 10px", borderRadius: "6px", cursor: "pointer",
                      border: `1px solid ${localFilter.dong === d.id ? "#3b4fd8" : "#e8eaed"}`,
                      background: localFilter.dong === d.id ? "#eff6ff" : "#fafafa",
                      color: localFilter.dong === d.id ? "#1d4ed8" : "#6b7280",
                      fontSize: "12px", fontWeight: localFilter.dong === d.id ? 600 : 400,
                      textAlign: "left" as const, fontFamily: FF, width: "100%",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                    <span>{d.label}</span>
                    {d.mode === "anchor" && (
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "1px 5px", borderRadius: "3px" }}>앵커</span>
                    )}
                    {d.mode === "popup" && (
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "1px 5px", borderRadius: "3px" }}>팝업</span>
                    )}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: "9px", color: "#b0b5bc", margin: "6px 0 0 2px", lineHeight: 1.4 }}>
                A·B동 앵커(3~6개월) / C동 팝업(1~2개월)
              </p>
            </div>

            {/* 시즌 */}
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>시즌</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {SEASONS.map(s => (
                  <FilterBtn key={s.id} label={s.label} active={localFilter.season === s.id}
                    onClick={() => setLocalFilter(f => ({ ...f, season: s.id }))} />
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleApplyFilter} style={{
            width: "100%", padding: "12px", borderRadius: "8px",
            background: "#3b4fd8", color: "#fff", border: "none",
            fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FF,
          }}>
            이 조건으로 분석하기 →
          </button>
        </div>

        {/* 발굴 입력 폼 */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: "10px", padding: "24px 28px" }}>
          <DemoBadge note="실존 브랜드만 입력. AI가 공간 적합도·배치 동을 자동 분석합니다." />

          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px", marginTop: "12px" }}>
            ＋ 브랜드 후보 등록
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
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
                {SEASONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
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
            width: "100%", padding: "12px", borderRadius: "8px",
            background: submitting || !name.trim() ? "#d1d5db" : "#3b4fd8",
            color: "#fff", border: "none", fontSize: "13px", fontWeight: 700,
            cursor: submitting || !name.trim() ? "not-allowed" : "pointer",
            fontFamily: FF,
          }}>
            {submitting ? "AI 분석 중..." : "등록 + AI 분석 →"}
          </button>

          {submitResult && (
            <div style={{
              marginTop: "10px", padding: "10px 14px", borderRadius: "7px",
              background: submitResult.ok ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${submitResult.ok ? "#86efac" : "#fca5a5"}`,
              fontSize: "12px", color: submitResult.ok ? "#15803d" : "#dc2626", lineHeight: 1.55,
            }}>
              {submitResult.msg}
            </div>
          )}
        </div>

        {/* 등록 목록 */}
        {brands.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: "10px", padding: "24px 28px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px" }}>
              📋 등록 목록 ({brands.length}개)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {brands.map(b => (
                <div key={b.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 14px", background: "#fafafa",
                  borderRadius: "7px", border: "1px solid #f0f0f0",
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{b.name}</span>
                    {b.instagram_handle && (
                      <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "6px" }}>{b.instagram_handle}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "5px", background: "#f0f4ff", color: "#3b4fd8", border: "1px solid #c7d2fe", fontWeight: 600 }}>
                      {b.category}
                    </span>
                    {b.dong !== "TBD" && (
                      <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "5px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", fontWeight: 600 }}>
                        {b.dong}동
                      </span>
                    )}
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                      적합 {b.matrix_x} · 집객 {b.matrix_y}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
