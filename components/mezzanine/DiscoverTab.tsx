"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CATS = [
  { id: "wellness",  label: "웰니스·아로마",      comment: "인증샷 화제 성장" },
  { id: "decor",     label: "감성 소품·인센스",    comment: "팝업 화제성 최상" },
  { id: "bodycare",  label: "비건 바디케어",        comment: "서북권 밀착 D2C" },
  { id: "lifestyle", label: "라이프스타일 편집샵",  comment: "복합공간 최적" },
  { id: "local",     label: "지역 로컬 브랜드",     comment: "증산역 권역 밀착" },
] as const;
type CatId = typeof CATS[number]["id"];

// CTA 클릭 시 이동할 탭 매핑
const CTA_TARGET: Record<CatId, string> = {
  wellness:  "diagnose",
  decor:     "diagnose",
  bodycare:  "inbox",
  lifestyle: "setup",
  local:     "setup",
};

const STATIC_DETAIL: Record<CatId, {
  desc: string;
  fit: number;
  bars: number[];
  labels: string[];
  cases: { space: string; dur: string }[];
  tags: string[];
  cta: string;
}> = {
  wellness: {
    desc: "인스타 인증샷 유발 지수가 가장 높고, 오프라인 쇼룸 미보유 D2C 비율이 타 카테고리 대비 높습니다. 서울 서북권 확장을 원하는 브랜드가 집중돼 있습니다.",
    fit: 5,
    bars: [20, 32, 45, 60, 74, 88, 91],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "성수 팝업 A", dur: "6주" },
      { space: "홍대 팝업 B", dur: "4주" },
    ],
    tags: ["D2C 직판", "인스타 강함", "팔로워 5천~1.5만"],
    cta: "Diagnose 매트릭스에서 웰니스 후보 보기",
  },
  decor: {
    desc: "플리마켓·콜라보 이력이 잦고 설치비 분담 조건만 맞으면 입점 확률이 높습니다. 메자닌 A·B동의 오픈 구조와 궁합이 좋습니다.",
    fit: 4,
    bars: [15, 24, 38, 52, 65, 70, 72],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "연남 팝업 C", dur: "3주" },
      { space: "마포 팝업 D", dur: "5주" },
    ],
    tags: ["콜라보 잦음", "설치비 협의 필요", "팔로워 5천~2만"],
    cta: "Diagnose 탭에서 조건 회신 후보 보기",
  },
  bodycare: {
    desc: "성수 검증 후 서북권 진출을 원하는 D2C 브랜드가 늘고 있습니다. 3일 무응답 후속 컨택 대상군이 여기에 집중돼 있습니다.",
    fit: 4,
    bars: [10, 18, 28, 38, 50, 58, 62],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "상수 팝업 E", dur: "2주" },
      { space: "신촌 팝업 F", dur: "4주" },
    ],
    tags: ["오프라인 진출 희망", "팔로워 1만대", "후속 컨택 적합"],
    cta: "Inbox 탭에서 무응답 후보 확인하기",
  },
  lifestyle: {
    desc: "복합문화공간에 최적화된 카테고리입니다. C동 쇼룸 특화 구역에 배치 시 체류시간이 길고 재방문율이 높습니다.",
    fit: 3,
    bars: [30, 33, 36, 40, 44, 48, 50],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "합정 팝업 G", dur: "8주" },
      { space: "이태원 팝업 H", dur: "6주" },
    ],
    tags: ["편집샵 형태", "복합공간 최적", "장기 계약 선호"],
    cta: "Setup 탭에서 C동 배치 조건 확인하기",
  },
  local: {
    desc: "증산역·수색 권역 밀착 브랜드는 재방문율이 높고 서북권 커뮤니티 연동 효과가 있습니다. 단, SNS 바이럴 파급력은 낮습니다.",
    fit: 3,
    bars: [25, 27, 30, 32, 35, 38, 40],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "수색 팝업 I", dur: "3주" },
      { space: "은평 팝업 J", dur: "4주" },
    ],
    tags: ["지역 밀착", "재방문율 높음", "SNS 파급력 낮음"],
    cta: "Setup 탭에서 지역 필터 조건 확인하기",
  },
};

interface LiveCatData {
  description: string;
  tags: string[];
  matchRate: number;
  why: string;
  risk: string;
}

interface Props {
  onSelectCategory: (cat: { id: string; label: string; matchRate: number | null }) => void;
  onNavigate: (tabId: string, updates?: Record<string, unknown>) => void;
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
        <div style={{
          height: "5px", borderRadius: "999px",
          width: `${clamped}%`, background: color,
          transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ fontSize: "10px", fontWeight: 700, color, textAlign: "right" }}>
        {clamped}
      </span>
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
  const [selected, setSelected] = useState<CatId>("wellness");
  const [isLive, setIsLive] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveData, setLiveData] = useState<Record<string, LiveCatData>>({});
  const [ownerRev, setOwnerRev] = useState<Record<string, string>>({});

  const handleSelectCat = (catId: CatId) => {
    setSelected(catId);
    const cat = CATS.find(c => c.id === catId)!;
    onSelectCategory({
      id: catId,
      label: cat.label,
      matchRate: liveData[catId]?.matchRate ?? null,
    });
  };

  const fetchLiveDiscover = async () => {
    if (liveLoading) return;
    setLiveLoading(true);
    try {
      const res = await fetch("/api/mezzanine/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: CATS.map(c => ({ id: c.id, label: c.label })),
        }),
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
      console.warn("라이브 Discover 실패 → 정적 데모로 대체");
      setLiveData({});
      setIsLive(false);
    } finally {
      setLiveLoading(false);
    }
  };

  const sortedCats = isLive && Object.keys(liveData).length > 0
    ? [...CATS].sort((a, b) => (liveData[b.id]?.matchRate ?? 0) - (liveData[a.id]?.matchRate ?? 0))
    : [...CATS];

  const staticDetail = STATIC_DETAIL[selected];
  const live = liveData[selected];

  const displayDesc = live?.description ?? staticDetail.desc;
  const displayTags = live?.tags ?? staticDetail.tags;
  const displayFit = live ? Math.min(5, Math.max(1, Math.round(live.matchRate / 20))) : staticDetail.fit;

  const handleCTA = () => {
    const cat = CATS.find(c => c.id === selected)!;
    onSelectCategory({
      id: selected,
      label: cat.label,
      matchRate: liveData[selected]?.matchRate ?? null,
    });
    onNavigate(CTA_TARGET[selected]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,720px)", gap: "0 25vw", fontFamily: FF }}>

      {/* ── 좌: 사이드바 ── */}
      <div style={{
        background: "#F7F8FA",
        borderRight: "1px solid #e8eaed",
        borderRadius: "8px",
        padding: "14px 12px",
        overflowY: "auto",
      }}>
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
                    {cat.label}
                  </p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>{cat.comment}</p>
                </div>
                {rate !== undefined
                  ? <MatchRateBar rate={rate} />
                  : <div style={{ width: "52px" }} />
                }
              </div>
            );
          })}
        </div>

        {isLive ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              fontSize: "10px", color: "#3b4fd8", fontWeight: 600,
              padding: "5px 8px", borderRadius: "5px",
              border: "1px solid #c7d2fe", background: "#eff6ff",
            }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#3b4fd8", display: "inline-block",
                animation: "pulse 2s infinite",
              }} />
              라이브 실행 중
            </div>
            <button
              onClick={fetchLiveDiscover}
              disabled={liveLoading}
              style={{
                width: "100%", padding: "6px 8px",
                background: "#fff", border: "1px solid #3b4fd8",
                borderRadius: "5px", fontSize: "10px",
                color: liveLoading ? "#9ca3af" : "#3b4fd8",
                fontWeight: 600, cursor: liveLoading ? "not-allowed" : "pointer",
                fontFamily: FF,
              }}
            >
              {liveLoading ? "분석 중..." : "↺ 조건 바꿔서 다시 돌리기"}
            </button>
          </div>
        ) : (
          <button
            onClick={fetchLiveDiscover}
            disabled={liveLoading}
            style={{
              width: "100%", padding: "8px",
              background: liveLoading ? "#f0f1f3" : "#3b4fd8",
              border: "none", borderRadius: "5px",
              fontSize: "11px",
              color: liveLoading ? "#9ca3af" : "#fff",
              fontWeight: 600, cursor: liveLoading ? "not-allowed" : "pointer",
              fontFamily: FF,
            }}
          >
            {liveLoading ? "⏳ 분석 중..." : "▶ 라이브 Discover 실행"}
          </button>
        )}
      </div>

      {/* ── 우: 메인 ── */}
      <div style={{ padding: "20px 0", overflowY: "auto" }}>

        {/* 제목 + 적합도 */}
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
            {CATS.find(c => c.id === selected)?.label}
          </h2>
          <StarFit n={displayFit} />
        </div>

        {/* 설명 */}
        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>
          {displayDesc}
        </p>

        {/* Why + Risk (라이브 시만) */}
        {live && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            <div style={{
              padding: "14px 16px", background: "#f0f4ff",
              borderRadius: "8px", border: "1px solid #c7d2fe",
            }}>
              <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#3b4fd8", margin: "0 0 6px 0" }}>
                💡 발굴 이유 — 이 공간과의 연결고리
              </p>
              <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.65, margin: 0 }}>
                {live.why}
              </p>
            </div>
            <div style={{
              padding: "14px 16px", background: "#fefce8",
              borderRadius: "8px", border: "1px solid #fde68a",
            }}>
              <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#92400e", margin: "0 0 6px 0" }}>
                ⚠️ 공간적 한계
              </p>
              <p style={{ fontSize: "13px", color: "#78350f", lineHeight: 1.65, margin: 0 }}>
                {live.risk}
              </p>
            </div>
          </div>
        )}

        {/* 트렌드 차트 */}
        <div style={{
          background: "#fff", borderRadius: "12px", border: "1px solid #e8eaed",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px 24px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: 0 }}>
              팝업 관심 지수 추이
            </p>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>예시 데이터</span>
          </div>
          <MiniBarChart bars={staticDetail.bars} labels={staticDetail.labels} />
        </div>

        {/* 유사 공간 사례 */}
        <div style={{
          background: "#fff", borderRadius: "12px", border: "1px solid #e8eaed",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px 24px", marginBottom: "20px",
        }}>
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "14px" }}>
            유사 공간 사례
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            {staticDetail.cases.map((c, i) => {
              const key = `${selected}-${i}`;
              return (
                <div key={i} style={{
                  flex: 1, padding: "14px 16px", background: "#f9fafb",
                  borderRadius: "8px", border: "1px solid #e8eaed",
                }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827", margin: "0 0 10px 0" }}>{c.space}</p>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                    <div>
                      <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 2px 0" }}>운영 기간</p>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: 0 }}>{c.dur}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 3px 0" }}>평균 매출 (주)</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="text"
                          value={ownerRev[key] ?? ""}
                          onChange={e => setOwnerRev(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="대표님 감으로"
                          style={{
                            fontSize: "12px", fontWeight: 600,
                            padding: "4px 8px", borderRadius: "5px",
                            border: "1px solid #e8eaed", background: "#fff",
                            width: "100%", outline: "none",
                            color: "#374151", fontFamily: FF,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: "10px", color: "#b0b5bc", marginTop: "10px", margin: "10px 0 0 0" }}>
            이 칸은 2주 파일럿 실측으로 채웁니다 — 지금은 대표님 감으로.
          </p>
        </div>

        {/* 태그 */}
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "28px" }}>
          {displayTags.map((t, i) => (
            <span key={i} style={{
              fontSize: "12px", fontWeight: 500, padding: "5px 12px",
              borderRadius: "6px", background: "#f0f4ff",
              border: "1px solid #c7d2fe", color: "#3b4fd8",
            }}>{t}</span>
          ))}
        </div>

        {/* CTA — 실제 탭 전환 */}
        <div
          onClick={handleCTA}
          style={{
            background: "#f0f4ff", borderRadius: "8px", border: "1px solid #c7d2fe",
            padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer", transition: "background 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e0eaff")}
          onMouseLeave={e => (e.currentTarget.style.background = "#f0f4ff")}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#3b4fd8" }}>→ {staticDetail.cta}</span>
          <span style={{ fontSize: "12px", color: "#6272c4", flexShrink: 0 }}>탭 전환 →</span>
        </div>
      </div>
    </div>
  );
}
