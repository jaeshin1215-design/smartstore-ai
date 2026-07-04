"use client";

import { useState, useEffect } from "react";

interface CustomerPoint {
  customer_id: string;
  order_count: number;
  avg_order_value: number;
}

interface ClusterInfo {
  cx: number; cy: number; rx: number; ry: number; color: string; label: string;
}

// ── K-Means (인라인, 의존성 없음) ──────────────────────────
function kmeans(pts: [number, number][], k: number, iter = 120): { clusters: number[]; centroids: [number, number][] } {
  if (pts.length === 0) return { clusters: [], centroids: [] };
  const n = pts.length;
  // 초기 centroid: 균등 간격
  let centroids: [number, number][] = Array.from({ length: k }, (_, i) => {
    const idx = Math.floor((i + 0.5) * n / k);
    return [...pts[idx]] as [number, number];
  });
  let clusters = new Array<number>(n).fill(0);
  for (let it = 0; it < iter; it++) {
    const next = pts.map(p => {
      let best = 0, bestD = Infinity;
      centroids.forEach(([cx, cy], ki) => {
        const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
        if (d < bestD) { bestD = d; best = ki; }
      });
      return best;
    });
    if (next.every((c, i) => c === clusters[i])) break;
    clusters = next;
    centroids = centroids.map((_, ki) => {
      const ms = pts.filter((_, i) => clusters[i] === ki);
      if (!ms.length) return centroids[ki];
      return [ms.reduce((s, p) => s + p[0], 0) / ms.length, ms.reduce((s, p) => s + p[1], 0) / ms.length];
    });
  }
  return { clusters, centroids };
}

function inertia(pts: [number, number][], clusters: number[], centroids: [number, number][]): number {
  return pts.reduce((s, p, i) => {
    const [cx, cy] = centroids[clusters[i]] ?? [0, 0];
    return s + (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
  }, 0);
}

function elbowK(pts: [number, number][], maxK = 6): number {
  if (pts.length < 4) return 2;
  const cap = Math.min(maxK, pts.length);
  const ines: number[] = [];
  for (let k = 2; k <= cap; k++) {
    const { clusters, centroids } = kmeans(pts, k);
    ines.push(inertia(pts, clusters, centroids));
  }
  // 이차 미분 최대점 = 엘보우
  let best = 0, bestVal = -Infinity;
  for (let i = 1; i < ines.length - 1; i++) {
    const d2 = ines[i - 1] - 2 * ines[i] + ines[i + 1];
    if (d2 > bestVal) { bestVal = d2; best = i; }
  }
  return best + 2; // offset: K starts at 2
}

// ── 색상 팔레트 ───────────────────────────────────────────
const CLUSTER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#ef567c"];

const QUADRANT_LABELS: Record<string, { title: string; color: string }> = {
  "high-repeat":  { title: "VIP 감사 쿠폰",    color: "#fdf4ff" },
  "high-one":     { title: "재구매 유도 쿠폰",  color: "#eff6ff" },
  "low-repeat":   { title: "교차판매 제안",     color: "#f0fdf4" },
  "low-one":      { title: "재구매 첫 유도",    color: "#fff7ed" },
};

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function CustomerMatrix({ storeId }: { storeId: string }) {
  const [points,      setPoints]      = useState<CustomerPoint[]>([]);
  const [medianPrice, setMedianPrice] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/customers?store_id=${storeId}`)
      .then(r => r.json())
      .then(d => {
        setPoints(d.points ?? []);
        setMedianPrice(d.median_price ?? 0);
        setSampleCount(d.sample_count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#8f9399", fontSize: "13px", fontFamily: "'Pretendard', sans-serif" }}>
      고객 매트릭스 로딩 중...
    </div>
  );
  if (points.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#8f9399", fontSize: "13px", fontFamily: "'Pretendard', sans-serif" }}>
      고객 주문 데이터가 없습니다.
    </div>
  );

  // ── 좌표 계산 ────────────────────────────────────────────
  const W = 640, H = 420;
  const PL = 64, PR = 24, PT = 28, PB = 52;
  const PW = W - PL - PR, PH = H - PT - PB;

  const maxPrice = Math.max(...points.map(p => p.avg_order_value), medianPrice * 2);
  const maxCount = Math.max(...points.map(p => p.order_count), 2);

  // X: order_count 정규화 (0~1) 후 좌우 그룹에 배치
  // 1회: [0.05, 0.45], 재구매: [0.55, 0.95]
  const hashJitter = (id: string, range: number) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    return ((h & 0xff) / 255) * range;
  };

  const toSvg = (p: CustomerPoint) => {
    const isRepeat = p.order_count > 1;
    const xBase = isRepeat ? 0.58 : 0.08;
    const xRange = 0.34;
    const xNorm = xBase + hashJitter(p.customer_id, xRange);
    const yNorm = maxPrice > 0 ? p.avg_order_value / maxPrice : 0;
    return {
      svgX: PL + xNorm * PW,
      svgY: PT + (1 - yNorm) * PH,
      isRepeat,
    };
  };

  // K-Means 입력: 정규화된 [x, y]
  const kData: [number, number][] = points.map(p => {
    const xNorm = p.order_count > 1 ? 0.75 : 0.25;
    const yNorm = maxPrice > 0 ? p.avg_order_value / maxPrice : 0;
    return [xNorm, yNorm];
  });
  const bestK = elbowK(kData, 6);
  const { clusters, centroids } = kmeans(kData, bestK);

  // 클러스터 타원 계산 (표준편차 기반)
  const clusterEllipses: ClusterInfo[] = centroids.map(([kcx, kcy], ki) => {
    const members = kData.filter((_, i) => clusters[i] === ki);
    const stdX = members.length > 1
      ? Math.sqrt(members.reduce((s, p) => s + (p[0] - kcx) ** 2, 0) / members.length)
      : 0.08;
    const stdY = members.length > 1
      ? Math.sqrt(members.reduce((s, p) => s + (p[1] - kcy) ** 2, 0) / members.length)
      : 0.06;
    return {
      cx: PL + kcx * PW,
      cy: PT + (1 - kcy) * PH,
      rx: Math.max(PW * (stdX * 2.5 + 0.04), 18),
      ry: Math.max(PH * (stdY * 2.5 + 0.03), 14),
      color: CLUSTER_COLORS[ki % CLUSTER_COLORS.length],
      label: `G${ki + 1}`,
    };
  });

  // 4분면 구분선 SVG 좌표
  const xSepSvg = PL + 0.5 * PW; // 1회 | 재구매 경계
  const ySepSvg = PT + (1 - (maxPrice > 0 ? medianPrice / maxPrice : 0.5)) * PH;

  // Y축 눈금 (3개)
  const yTicks = [0, medianPrice, maxPrice].map(v => ({
    y: PT + (1 - (maxPrice > 0 ? v / maxPrice : 0)) * PH,
    label: v >= 10000 ? `${Math.round(v / 1000)}k` : `${v}`,
  }));

  return (
    <div style={{ fontFamily: "'Pretendard', -apple-system, sans-serif", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "14px", flexShrink: 0 }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0d0d0e" }}>고객 매트릭스</span>
        <span style={{ fontSize: "11px", color: "#8f9399" }}>객단가 × 구매횟수 — 쿠폰 발송 기준</span>
      </div>

      {/* SVG wrapper — flex: 1 로 남은 높이 채움 */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
        {/* 배경 4분면 */}
        {[
          { x: PL,       y: PT,       w: xSepSvg - PL, h: ySepSvg - PT, q: "high-one" },
          { x: xSepSvg,  y: PT,       w: W - PR - xSepSvg, h: ySepSvg - PT, q: "high-repeat" },
          { x: PL,       y: ySepSvg,  w: xSepSvg - PL, h: H - PB - ySepSvg, q: "low-one" },
          { x: xSepSvg,  y: ySepSvg,  w: W - PR - xSepSvg, h: H - PB - ySepSvg, q: "low-repeat" },
        ].map(({ x, y, w, h, q }) => (
          <rect key={q} x={x} y={y} width={w} height={h} fill={QUADRANT_LABELS[q].color} />
        ))}

        {/* 구분선 — 실선 */}
        <line x1={xSepSvg} y1={PT} x2={xSepSvg} y2={H - PB} stroke="#c0c4cc" strokeWidth={1.2} />
        <line x1={PL} y1={ySepSvg} x2={W - PR} y2={ySepSvg} stroke="#c0c4cc" strokeWidth={1.2} />

        {/* 사분면 레이블 */}
        {[
          { x: PL + (xSepSvg - PL) / 2, y: PT + (ySepSvg - PT) / 2, q: "high-one" },
          { x: xSepSvg + (W - PR - xSepSvg) / 2, y: PT + (ySepSvg - PT) / 2, q: "high-repeat" },
          { x: PL + (xSepSvg - PL) / 2, y: ySepSvg + (H - PB - ySepSvg) / 2, q: "low-one" },
          { x: xSepSvg + (W - PR - xSepSvg) / 2, y: ySepSvg + (H - PB - ySepSvg) / 2, q: "low-repeat" },
        ].map(({ x, y, q }) => (
          <text key={q} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: "11px", fill: "#a0a4ab", fontWeight: 600, letterSpacing: "0.03em" }}>
            {QUADRANT_LABELS[q].title}
          </text>
        ))}

        {/* K-Means 타원 — 점선 */}
        {clusterEllipses.map((e, ki) => (
          <ellipse key={ki} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
            fill="none"
            stroke={e.color}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            opacity={0.7}
          />
        ))}

        {/* 산점도 */}
        {points.map((p, i) => {
          const { svgX, svgY } = toSvg(p);
          const color = CLUSTER_COLORS[clusters[i] % CLUSTER_COLORS.length];
          return (
            <circle key={p.customer_id} cx={svgX} cy={svgY} r={4}
              fill={color} fillOpacity={0.75} stroke={color} strokeWidth={0.5}
            />
          );
        })}

        {/* Y축 눈금 */}
        {yTicks.map(({ y, label }, i) => (
          <g key={i}>
            <line x1={PL - 4} y1={y} x2={PL} y2={y} stroke="#c0c4cc" strokeWidth={1} />
            <text x={PL - 7} y={y} textAnchor="end" dominantBaseline="middle"
              style={{ fontSize: "10px", fill: "#8f9399" }}>{label}</text>
          </g>
        ))}

        {/* X축 구분선 라벨 */}
        <text x={PL + (xSepSvg - PL) / 2} y={H - PB + 18} textAnchor="middle"
          style={{ fontSize: "10px", fill: "#8f9399" }}>1회 구매</text>
        <text x={xSepSvg + (W - PR - xSepSvg) / 2} y={H - PB + 18} textAnchor="middle"
          style={{ fontSize: "10px", fill: "#8f9399" }}>재구매</text>

        {/* Y축 라벨 */}
        <text x={14} y={PT + PH / 2} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90, 14, ${PT + PH / 2})`}
          style={{ fontSize: "10px", fill: "#8f9399" }}>객단가</text>

        {/* K-Means 범례 */}
        {clusterEllipses.map((e, ki) => (
          <g key={ki}>
            <rect x={PL + ki * 58} y={H - 14} width={8} height={8} rx={2} fill={e.color} opacity={0.7} />
            <text x={PL + ki * 58 + 11} y={H - 7} style={{ fontSize: "10px", fill: "#8f9399" }}>그룹{ki + 1}</text>
          </g>
        ))}
      </svg>
      </div>{/* /SVG wrapper */}

      {/* 푸터 */}
      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", color: "#8f9399" }}>
          표본 {sampleCount}명 — 참고용, 확정 아님
        </span>
        <span style={{ fontSize: "11px", color: "#8f9399" }}>
          객단가 기준선 {medianPrice.toLocaleString()}원 (중앙값)
        </span>
        <span style={{ fontSize: "11px", color: "#8f9399" }}>
          K-Means K={bestK} (엘보우 자동)
        </span>
        <span style={{ fontSize: "11px", color: "#c0c4cc" }}>
          ···  점선 = 클러스터 참고용
        </span>
      </div>
    </div>
  );
}
