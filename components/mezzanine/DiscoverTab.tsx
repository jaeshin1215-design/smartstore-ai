"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";

const FF = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const CATS = [
  { id: "wellness", rank: 1, label: "웰니스·아로마", growth: 4.8, comment: "인증샷 화제 성장" },
  { id: "decor",    rank: 2, label: "감성 소품·인센스", growth: 3.2, comment: "팝업 화제성 최상" },
  { id: "bodycare", rank: 3, label: "비건 바디케어", growth: 2.1, comment: "서북권 밀착 D2C" },
  { id: "lifestyle",rank: 4, label: "라이프스타일 편집샵", growth: 1.8, comment: "복합공간 최적" },
  { id: "local",    rank: 5, label: "지역 로컬 브랜드", growth: 1.5, comment: "증산역 권역 밀착" },
] as const;
type CatId = typeof CATS[number]["id"];

const DETAIL: Record<CatId, {
  title: string; desc: string; fit: number;
  bars: number[]; labels: string[];
  cases: { space: string; dur: string; rev: string }[];
  tags: string[];
  cta: string;
}> = {
  wellness: {
    title: "웰니스·아로마",
    desc: "인스타 인증샷 유발 지수가 가장 높고, 오프라인 쇼룸 미보유 D2C 비율이 타 카테고리 대비 2.4배 높습니다. 서울 서북권 확장을 원하는 브랜드가 집중돼 있습니다.",
    fit: 5,
    bars: [20, 32, 45, 60, 74, 88, 91],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "성수 팝업 A", dur: "6주", rev: "230만원/주" },
      { space: "홍대 팝업 B", dur: "4주", rev: "185만원/주" },
    ],
    tags: ["D2C 직판", "인스타 강함", "팔로워 5천~1.5만"],
    cta: "Diagnose 매트릭스에서 웰니스 후보 보기",
  },
  decor: {
    title: "감성 소품·인센스",
    desc: "플리마켓·콜라보 이력이 잦고 설치비 분담 조건만 맞으면 입점 확률이 높습니다. 메자닌 A·B동의 오픈 구조와 궁합이 좋습니다.",
    fit: 4,
    bars: [15, 24, 38, 52, 65, 70, 72],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "연남 팝업 C", dur: "3주", rev: "125만원/주" },
      { space: "마포 팝업 D", dur: "5주", rev: "152만원/주" },
    ],
    tags: ["콜라보 잦음", "설치비 협의 필요", "팔로워 5천~2만"],
    cta: "Diagnose 탭에서 조건 회신 후보 보기",
  },
  bodycare: {
    title: "비건 바디케어",
    desc: "성수 검증 후 서북권 진출을 원하는 D2C 브랜드가 늘고 있습니다. 3일 무응답 후속 컨택 대상군이 여기에 집중돼 있습니다.",
    fit: 4,
    bars: [10, 18, 28, 38, 50, 58, 62],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "상수 팝업 E", dur: "2주", rev: "92만원/주" },
      { space: "신촌 팝업 F", dur: "4주", rev: "115만원/주" },
    ],
    tags: ["오프라인 진출 희망", "팔로워 1만대", "후속 컨택 적합"],
    cta: "Inbox 탭에서 무응답 후보 확인하기",
  },
  lifestyle: {
    title: "라이프스타일 편집샵",
    desc: "복합문화공간에 최적화된 카테고리입니다. C동 쇼룸 특화 구역에 배치 시 체류시간이 길고 재방문율이 높습니다.",
    fit: 3,
    bars: [30, 33, 36, 40, 44, 48, 50],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "합정 팝업 G", dur: "8주", rev: "198만원/주" },
      { space: "이태원 팝업 H", dur: "6주", rev: "172만원/주" },
    ],
    tags: ["편집샵 형태", "복합공간 최적", "장기 계약 선호"],
    cta: "Setup 탭에서 C동 배치 조건 확인하기",
  },
  local: {
    title: "지역 로컬 브랜드",
    desc: "증산역·수색 권역 밀착 브랜드는 재방문율이 높고 서북권 커뮤니티 연동 효과가 있습니다. 단, SNS 바이럴 파급력은 낮습니다.",
    fit: 3,
    bars: [25, 27, 30, 32, 35, 38, 40],
    labels: ["1월", "2월", "3월", "4월", "5월", "6월", "현재"],
    cases: [
      { space: "수색 팝업 I", dur: "3주", rev: "82만원/주" },
      { space: "은평 팝업 J", dur: "4주", rev: "97만원/주" },
    ],
    tags: ["지역 밀착", "재방문율 높음", "SNS 파급력 낮음"],
    cta: "Setup 탭에서 지역 필터 조건 확인하기",
  },
};

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

function StarFit({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: "14px", color: i <= n ? "#fbbf24" : "#e5e7eb" }}>★</span>
      ))}
      <span style={{ fontSize: "11px", color: "#6b7280", marginLeft: "4px" }}>메자닌 공간 적합도</span>
    </div>
  );
}

export default function DiscoverTab() {
  const [selected, setSelected] = useState<CatId>("wellness");
  const detail = DETAIL[selected];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,720px)", gap: "0 25vw", fontFamily: FF }}>

      {/* 좌: 사이드바 */}
      <div style={{
        background: "#F7F8FA",
        borderRight: "1px solid #e8eaed",
        borderRadius: "8px",
        padding: "14px 12px",
        overflowY: "auto",
      }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "10px" }}>
          팝업 화제 카테고리
        </p>
        <DemoBadge note="예시 데이터 — 파일럿 후 실데이터로 자동 교체" />

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {CATS.map((cat) => {
            const isActive = selected === cat.id;
            return (
              <div key={cat.id} onClick={() => setSelected(cat.id)} style={{
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
                }}>{cat.rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 1px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cat.label}
                  </p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>{cat.comment}</p>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "5px",
                  background: "#fff0f3", border: "1px solid #ffd6e0", color: "#c4345a",
                  display: "flex", alignItems: "center", gap: "1px", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  <span style={{ fontSize: "8px" }}>▲</span>{cat.growth}×
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우: 메인 */}
      <div style={{ padding: "20px 0", overflowY: "auto" }}>

        {/* 제목 + 적합도 */}
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
            {detail.title}
          </h2>
          <StarFit n={detail.fit} />
        </div>

        <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.75, marginBottom: "28px" }}>
          {detail.desc}
        </p>

        {/* 트렌드 차트 카드 */}
        <div style={{
          background: "#fff", borderRadius: "12px", border: "1px solid #e8eaed",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px 24px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: 0 }}>
              팝업 관심 지수 추이 (지수)
            </p>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>예시 데이터</span>
          </div>
          <MiniBarChart bars={detail.bars} labels={detail.labels} />
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
            {detail.cases.map((c, i) => (
              <div key={i} style={{
                flex: 1, padding: "14px 16px", background: "#f9fafb",
                borderRadius: "8px", border: "1px solid #e8eaed",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827", margin: "0 0 6px 0" }}>{c.space}</p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 2px 0" }}>운영 기간</p>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: 0 }}>{c.dur}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 2px 0" }}>평균 매출</p>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: 0 }}>{c.rev}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 태그 */}
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "28px" }}>
          {detail.tags.map((t, i) => (
            <span key={i} style={{
              fontSize: "12px", fontWeight: 500, padding: "5px 12px",
              borderRadius: "6px", background: "#f0f4ff",
              border: "1px solid #c7d2fe", color: "#3b4fd8",
            }}>{t}</span>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: "#f0f4ff", borderRadius: "8px", border: "1px solid #c7d2fe",
          padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#3b4fd8" }}>→ {detail.cta}</span>
          <span style={{ fontSize: "12px", color: "#6272c4" }}>탭 전환 →</span>
        </div>
      </div>
    </div>
  );
}
