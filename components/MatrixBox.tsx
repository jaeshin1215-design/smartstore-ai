"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id: string;
  name: string;
  url?: string;
  keyword: string;
  category: string;
  price: number;
  purchase_price: number;
  is_own: number;
  matrix_x?: number | null;
  matrix_y?: number | null;
  is_price_confirmed?: number;
  rawX?: number;
  rawY?: number;
}

const PRODUCT_COLORS = [
  "#ef567c", // Frill pink
  "#7c3aed", // Frill purple
  "#2563eb", // Frill royal blue
  "#0ea5e9", // Frill light blue
  "#10b981", // Frill green
  "#f59e0b", // Frill amber
  "#ec4899", // soft pink
  "#6366f1"  // indigo
];

export function getProductColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRODUCT_COLORS.length;
  return PRODUCT_COLORS[index];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface MatrixBoxProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setSelectedProductId: (id: string | null) => void;
  handleUpdateProduct: (id: string, fields: Partial<Product>) => Promise<void>;
  onSeoNavigate?: (keyword: string, tab?: string) => void;
  showLabels?: boolean;
  showGrid?: boolean;
  hoverProductId?: string | null;
  setHoverProductId?: (id: string | null) => void;
}

export default function MatrixBox({
  products,
  setProducts,
  setSelectedProductId,
  handleUpdateProduct,
  onSeoNavigate,
  showLabels = true,
  showGrid = true,
  hoverProductId,
  setHoverProductId
}: MatrixBoxProps) {
  const [bounds, setBounds] = useState<Bounds | null>({ minX: 0, maxX: 100, minY: 0, maxY: 100 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // SVG 물리 크기 (기존 오리지널 포맷)
  const W = 680;
  const PX = 60;
  const PY = 40;
  const PLOT_W = W - PX - 40;  // 580
  const PLOT_H = 380;           // 고정 (이전과 동일)
  const H = PY + PLOT_H + 70;  // 40 + 380 + 70 = 490 — 축 레이블 여백 확보

  const dragInfo = useRef<{
    productId: string;
    startX: number;
    startY: number;
    startMatrixX: number;
    startMatrixY: number;
    actualPlotW: number;
    actualPlotH: number;
  } | null>(null);

  // 1. 최초 바운더리 체크 및 수립
  useEffect(() => {
    const savedBounds = localStorage.getItem("sellfit_matrix_bounds");
    if (savedBounds) {
      setBounds(JSON.parse(savedBounds));
    } else {
      calculateAndSetBounds(products);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const calculateAndSetBounds = (list: Product[]) => {
    if (list.length === 0) {
      setBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 });
      return;
    }
    const xs = list.map(p => p.rawX || 0);
    const ys = list.map(p => p.rawY || 0);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 100);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 100);

    const next = {
      minX: Math.max(0, minX),
      maxX: Math.max(100, maxX),
      minY: Math.max(0, minY),
      maxY: Math.max(100, maxY)
    };
    setBounds(next);
    localStorage.setItem("sellfit_matrix_bounds", JSON.stringify(next));
  };

  // 2. 좌표 계산 및 충돌(오버랩) 보정 알고리즘 탑재
  const getSpreadCoordinates = (list: Product[]) => {
    if (!bounds) return {};
    const coords: Record<string, { cx: number; cy: number; mx: number; my: number; lx: number; ly: number; labelPosition: "top" | "bottom" | "bottom-far" }> = {};
    
    // 기본 좌표 계산
    list.forEach(p => {
      const mx = p.matrix_x !== null && p.matrix_x !== undefined ? p.matrix_x : 
        Math.round(((p.rawX! - bounds.minX) / Math.max(bounds.maxX - bounds.minX, 1)) * 100);

      const my = p.matrix_y !== null && p.matrix_y !== undefined ? p.matrix_y : 
        Math.round(((p.rawY! - bounds.minY) / Math.max(bounds.maxY - bounds.minY, 1)) * 100);

      const cx = PX + (mx / 100) * PLOT_W;
      const cy = PY + (1 - my / 100) * PLOT_H;

      /* Frill: r=5, 레이블 circle 바로 아래 밀착 = cy + 5 + 11 = cy + 16 */
      coords[p.id] = { cx, cy, mx, my, lx: cx, ly: cy + 5 + 11, labelPosition: "bottom" };
    });

    // 2D 충돌 회피 알고리즘 (오프셋 r=5 기준)
    const rBase = 5;
    const items = list.map(p => ({ id: p.id, ...coords[p.id] })).filter(item => item.cx !== undefined);
    
    // Y좌표 기준으로 정렬 (위쪽 상품부터 아래쪽 상품 순)
    items.sort((a, b) => a.cy - b.cy);

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        
        // 두 점 사이의 가로/세로 거리 측정
        const dx = Math.abs(a.cx - b.cx);
        const dy = Math.abs(a.cy - b.cy);
        
        if (dx < 35 && dy < 25) {
          // 충돌 감지! 위쪽 점(a)의 라벨은 위로 보내고, 아래쪽 점(b)의 라벨은 아래로 보냄
          if (coords[a.id].labelPosition === "bottom") {
            coords[a.id].labelPosition = "top";
            coords[a.id].ly = a.cy - rBase - 12;
          } else if (coords[a.id].labelPosition === "top") {
            // 이미 a가 top이면 b를 더 아래로 밀어냄
            coords[b.id].labelPosition = "bottom-far";
            coords[b.id].ly = b.cy + rBase + 27;
          }
        }
      }
    }

    return coords;
  };

  // 3. 드래그 앤 드롭 핸들러
  const handleMouseDown = (e: React.MouseEvent, productId: string, currentMx: number, currentMy: number) => {
    e.preventDefault();
    setSelectedProductId(productId);

    let actualPlotW = PLOT_W;
    let actualPlotH = PLOT_H;
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = rect.width / W;
      const scaleY = rect.height / H;
      actualPlotW = PLOT_W * scaleX;
      actualPlotH = PLOT_H * scaleY;
    }

    dragInfo.current = {
      productId,
      startX: e.clientX,
      startY: e.clientY,
      startMatrixX: currentMx,
      startMatrixY: currentMy,
      actualPlotW,
      actualPlotH
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragInfo.current) return;
    const { productId, startX, startY, startMatrixX, startMatrixY, actualPlotW, actualPlotH } = dragInfo.current;

    const dx = ((e.clientX - startX) / actualPlotW) * 100;
    const dy = -((e.clientY - startY) / actualPlotH) * 100;

    const nextMx = Math.min(Math.max(Math.round(startMatrixX + dx), 0), 100);
    const nextMy = Math.min(Math.max(Math.round(startMatrixY + dy), 0), 100);

    // 실시간 UI 업데이트
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, matrix_x: nextMx, matrix_y: nextMy };
      }
      return p;
    }));
  };

  const handleMouseUp = async () => {
    if (!dragInfo.current) return;
    const { productId } = dragInfo.current;
    
    const finalP = products.find(p => p.id === productId);
    if (finalP && finalP.matrix_x !== undefined && finalP.matrix_y !== undefined) {
      await handleUpdateProduct(productId, {
        matrix_x: finalP.matrix_x,
        matrix_y: finalP.matrix_y
      });
    }

    dragInfo.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const renderNameLines = (name: string, cx: number, ly: number, labelPosition: string, textFill = "#6b7280") => {
    let line1 = name;
    let line2 = "";

    // 스마트 2줄 줄바꿈 엔진 (스크린샷 정합용)
    const words = name.split(/\s+/);
    if (words.length > 1) {
      if (words[0].startsWith("[") && words[0].endsWith("]")) {
        if (words.length === 2) {
          line1 = words[0];
          line2 = words[1];
        } else if (words.length === 3) {
          line1 = words[0] + " " + words[1];
          line2 = words[2];
        } else {
          line1 = words[0] + " " + words.slice(1, Math.ceil(words.length / 2)).join(" ");
          line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
        }
      } else {
        const mid = Math.ceil(words.length / 2);
        line1 = words.slice(0, mid).join(" ");
        line2 = words.slice(mid).join(" ");
      }
    }

    const gap = 13;
    const startY = labelPosition === "top" ? ly - gap : ly;

    if (!line2) {
      return (
        <text x={cx} y={ly} textAnchor="middle" fill={textFill} fontSize="10" fontWeight="500"
          style={{ pointerEvents: "none", userSelect: "none", fontFamily: "'Pretendard', sans-serif" }}>
          {line1}
        </text>
      );
    }

    return (
      <text x={cx} y={startY} textAnchor="middle" fill={textFill} fontSize="10" fontWeight="500"
        style={{ pointerEvents: "none", userSelect: "none", fontFamily: "'Pretendard', sans-serif" }}>
        <tspan x={cx} dy="0">{line1}</tspan>
        <tspan x={cx} dy={gap}>{line2}</tspan>
      </text>
    );
  };

  if (!bounds) return <div style={{ fontSize: 12, color: "#94a3b8" }}>격차 축 구축 중...</div>;

  // Graph-Paper 가이드 그리드 선 (10단위) 생성
  const gridSteps = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      flex: 1, 
      height: "100%",
      background: "#ffffff"
    }}>

      {/* SVG Canvas Container */}
      <div style={{ 
        flex: 1, 
        position: "relative", 
        overflow: "hidden", 
        background: "#ffffff",
        minHeight: 320
      }}>
        {/* responsive SVG */}
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%" 
          height="100%" 
          style={{ overflow: "visible", display: "block" }}
        >
          {/* 사분면 배경 면 */}
          <g style={{ pointerEvents: "none" }}>
            <rect x={PX} y={PY} width={PLOT_W} height={PLOT_H} fill="#ffffff" />
          </g>

          {/* A-0. X/Y 축 경계선 */}
          <line x1={PX} y1={PY} x2={PX} y2={PY + PLOT_H} stroke="#e8eaed" strokeWidth="1" style={{ pointerEvents: "none" }} />
          <line x1={PX} y1={PY + PLOT_H} x2={PX + PLOT_W} y2={PY + PLOT_H} stroke="#e8eaed" strokeWidth="1" style={{ pointerEvents: "none" }} />

          {/* A. 사분면 라벨 — Frill 실측: 13px, 연한 회색, 중앙 배경처럼 */}
          <g style={{ pointerEvents: "none", userSelect: "none" }}>
            <text x={PX + PLOT_W / 4} y={PY + PLOT_H / 4} textAnchor="middle" alignmentBaseline="middle" fontSize="13" fontWeight="400" fill="#c8ccd4" opacity="1" fontFamily="'Pretendard', sans-serif">Quick Wins</text>
            <text x={PX + 3 * PLOT_W / 4} y={PY + PLOT_H / 4} textAnchor="middle" alignmentBaseline="middle" fontSize="13" fontWeight="400" fill="#c8ccd4" opacity="1" fontFamily="'Pretendard', sans-serif">Major Projects</text>
            <text x={PX + PLOT_W / 4} y={PY + 3 * PLOT_H / 4} textAnchor="middle" alignmentBaseline="middle" fontSize="13" fontWeight="400" fill="#c8ccd4" opacity="1" fontFamily="'Pretendard', sans-serif">Fill Ins</text>
            <text x={PX + 3 * PLOT_W / 4} y={PY + 3 * PLOT_H / 4} textAnchor="middle" alignmentBaseline="middle" fontSize="13" fontWeight="400" fill="#c8ccd4" opacity="1" fontFamily="'Pretendard', sans-serif">Thankless Tasks</text>
          </g>

          {/* B. 사분면 경계선 — Frill 실측: 얇은 실선 #e2e8f0 */}
          <line x1={PX + PLOT_W / 2} y1={PY} x2={PX + PLOT_W / 2} y2={PY + PLOT_H}
            stroke="#d1d5db" strokeWidth="1" strokeDasharray="5 4" style={{ pointerEvents: "none" }} />
          <line x1={PX} y1={PY + PLOT_H / 2} x2={PX + PLOT_W} y2={PY + PLOT_H / 2}
            stroke="#d1d5db" strokeWidth="1" strokeDasharray="5 4" style={{ pointerEvents: "none" }} />

          {/* C. 격자 — Frill 실측: 매우 연한 실선 */}
          {showGrid && gridSteps.map(step => {
            const x = PX + (step / 100) * PLOT_W;
            const y = PY + (step / 100) * PLOT_H;
            return (
              <g key={step} style={{ pointerEvents: "none" }}>
                <line x1={x} y1={PY} x2={x} y2={PY + PLOT_H} stroke="#f0f1f3" strokeWidth="0.7" />
                <line x1={PX} y1={y} x2={PX + PLOT_W} y2={y} stroke="#f0f1f3" strokeWidth="0.7" />
              </g>
            );
          })}

          {/* D. 축 라벨 — Y축: 왼쪽 마진 중앙 세로 / X축: 플롯 아래 좌측 */}
          {/* X축 */}
          <text x={PX + 6} y={PY + PLOT_H + 24} textAnchor="start"
            fill="#c4c8ce" fontSize="10" fontWeight="400"
            style={{ pointerEvents: "none", userSelect: "none", fontFamily: "'Pretendard', sans-serif" }}>
            수요(검색지수) →
          </text>
          {/* Y축 — Frill: ↑ 위, 마진율 아래로 읽히는 방향 (rotate 90°) */}
          <text x={PX - 20} y={PY + PLOT_H - 55} textAnchor="middle"
            fill="#c4c8ce" fontSize="10" fontWeight="400"
            style={{ pointerEvents: "none", userSelect: "none", fontFamily: "'Pretendard', sans-serif" }}>
            ↑
          </text>
          <text
            transform={`translate(${PX - 20}, ${PY + PLOT_H - 40}) rotate(90)`}
            textAnchor="start"
            fill="#c4c8ce" fontSize="10" fontWeight="400"
            style={{ pointerEvents: "none", userSelect: "none", fontFamily: "'Pretendard', sans-serif" }}>
            마진율
          </text>

          {/* E. 점 렌더링 (자사 채움 ●, 경쟁사/후보 비어있음 ○ 복구) */}
          {(() => {
            const spreadCoords = getSpreadCoordinates(products);
            return products.map((p) => {
              const coords = spreadCoords[p.id];
              if (!coords || (coords.cx === 0 && coords.cy === 0)) return null;
              const { cx, cy, mx, my, ly, labelPosition } = coords;

              const isHovered = p.id === hoverProductId;
              /* dim은 hover할 때만 트리거 — selectedProductId는 dim에 영향 없음 */
              const hasActive = !!hoverProductId;
              const isActive = isHovered;
              const dotColor = getProductColor(p.id);
              const r = 5;
              const dotOpacity = hasActive ? (isActive ? 1 : 0.2) : 1;
              /* 텍스트: hover active면 해당 dotColor, dim이면 연한 회색, 평상시 기본 */
              const textFill = hasActive ? (isActive ? dotColor : "#c4c8ce") : "#6b7280";

              return (
                <g
                  key={p.id}
                  style={{ cursor: "pointer", opacity: dotOpacity, transition: "opacity 0.15s ease" }}
                  onMouseEnter={() => setHoverProductId?.(p.id)}
                  onMouseLeave={() => setHoverProductId?.(null)}
                  onMouseDown={e => handleMouseDown(e, p.id, mx, my)}
                >
                  {/* 선택/hover halo */}
                  {isActive && (
                    <circle cx={cx} cy={cy} r={r + 6} fill={dotColor} fillOpacity="0.15" />
                  )}

                  {/* circle */}
                  <circle cx={cx} cy={cy} r={isHovered ? r + 1 : r}
                    fill={dotColor} stroke="white" strokeWidth="1.5"
                    style={{ transition: "r 0.1s ease" }}
                  />
                  <circle cx={cx} cy={cy} r="18" fill="transparent" />

                  {showLabels && renderNameLines(p.name, cx, ly, labelPosition, textFill)}
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
}