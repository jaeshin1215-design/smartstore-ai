"use client";

// Price Guard 보드 — Supply 상품 쿠팡 판매가 자동 모니터링 (2026-07-09 목업 기준)
// 데이터: /api/price-capture GET. 판정: 쿠팡 마진율 (판매가−공급가)/판매가 3단계.
// 감지·계산·이력만 — 가격 결정·변경 기능 없음.

import React, { useState, useEffect, useCallback } from "react";

interface HistoryPoint {
  check_date: string;
  price: number;
  margin_pct: number | null;
}

interface BoardRow {
  product_id: string;
  product_name: string;
  is_own: number;
  supply_price: number | null;
  coupang_url: string | null;
  today_price: number | null;
  margin_pct: number | null;
  margin_dropped: boolean;
  level: "안전" | "주의" | "위험" | null;
  is_item_winner: number | null;
  last_checked_at: string | null;
  history: HistoryPoint[];
}

interface BoardData {
  rows: BoardRow[];
  counts: { danger: number; warn: number; safe: number };
  checked_today: boolean;
  last_checked_at: string | null;
}

const LEVEL_STYLE: Record<string, { bg: string; color: string; border: string; line: string }> = {
  위험: { bg: "#fee2e2", color: "#dc2626", border: "#fecaca", line: "#dc2626" },
  주의: { bg: "#fef9c3", color: "#854d0e", border: "#fde68a", line: "#ca8a04" },
  안전: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", line: "#16a34a" },
};

function Sparkline({ history, color }: { history: HistoryPoint[]; color: string }) {
  const points = history.slice(-14).map(h => h.price);
  if (points.length < 2) {
    return <span style={{ fontSize: 11, color: "#c0c4cc" }}>데이터 누적 중</span>;
  }
  const w = 90, h = 24, pad = 2;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DetailChart({ history, supplyPrice }: { history: HistoryPoint[]; supplyPrice: number | null }) {
  const points = history.slice(-30);
  if (points.length < 2) {
    return <div style={{ fontSize: 12, color: "#9ca3af", padding: "16px 0" }}>그래프는 2일 이상 수집 후 표시됩니다.</div>;
  }
  const w = 560, h = 140, padX = 44, padY = 16;
  const prices = points.map(p => p.price);
  const min = Math.min(...prices, supplyPrice ?? Infinity);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const x = (i: number) => padX + (i / (points.length - 1)) * (w - padX - 12);
  const y = (v: number) => padY + (1 - (v - min) / range) * (h - padY * 2);
  const line = points.map((p, i) => `${x(i)},${y(p.price)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {/* 공급가 기준선 — 라벨은 우측 끝 (좌측 가격 라벨과 겹침 방지) */}
      {supplyPrice != null && supplyPrice >= min && supplyPrice <= max && (
        <>
          <line x1={padX} y1={y(supplyPrice)} x2={w - 12} y2={y(supplyPrice)} stroke="#c0c4cc" strokeDasharray="4 3" strokeWidth={1} />
          <text x={w - 12} y={y(supplyPrice) - 4} fontSize={10} fill="#9ca3af" textAnchor="end">
            공급가 {supplyPrice.toLocaleString()}
          </text>
        </>
      )}
      <polyline points={line} fill="none" stroke="#ef567c" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.price)} r={2.5} fill="#ef567c" />
      ))}
      {/* 최소·최대 라벨 (공급가와 겹치면 생략) */}
      <text x={0} y={y(max) + 4} fontSize={10} fill="#6b7280">{max.toLocaleString()}</text>
      {(supplyPrice == null || Math.abs(y(min) - y(supplyPrice)) > 12) && (
        <text x={0} y={y(min) + 4} fontSize={10} fill="#6b7280">{min.toLocaleString()}</text>
      )}
    </svg>
  );
}

export default function PriceGuardBoard({ storeId }: { storeId: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/price-capture?store_id=${storeId}`);
      const d = await res.json();
      setData(d);
    } catch { /* 무시 */ }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ padding: 24, fontSize: 13, color: "#9ca3af" }}>가격 데이터 불러오는 중...</div>;
  }
  if (!data || data.rows.length === 0) {
    return (
      <div style={{ background: "#f9fafb", borderRadius: 12, border: "1px dashed #e0ede9", padding: "28px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>추적 중인 상품 없음</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>상품 등록에서 쿠팡 상품 URL을 넣으면 이 보드에 자동으로 나타납니다.</div>
      </div>
    );
  }

  const { rows, counts } = data;
  const lastTime = data.last_checked_at
    ? new Date(data.last_checked_at.replace(" ", "T") + "Z").toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 상단 요약 배지 */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #e0ede9",
        padding: "14px 20px", marginBottom: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: data.checked_today ? "#0f2a1e" : "#b45309" }}>
          {data.checked_today ? "오늘 확인 완료" : "오늘 미수집"}
          {lastTime && <span style={{ fontWeight: 400, color: "#9ca3af" }}> · {lastTime}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {([["위험", counts.danger], ["주의", counts.warn], ["안전", counts.safe]] as const).map(([label, n]) => {
            const s = LEVEL_STYLE[label];
            return (
              <span key={label} style={{
                fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 12,
                background: s.bg, color: s.color, border: `1px solid ${s.border}`,
              }}>
                {label} {n}
              </span>
            );
          })}
        </div>
      </div>

      {/* 상품별 행 */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e8eaed" }}>
                {["상품", "공급가", "오늘 판매가", "마진율", "상태", "최근 추이"].map(h => (
                  <th key={h} style={{ textAlign: h === "상품" ? "left" : "right", padding: "10px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const s = r.level ? LEVEL_STYLE[r.level] : null;
                const expanded = expandedId === r.product_id;
                return (
                  <React.Fragment key={r.product_id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : r.product_id)}
                      style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: expanded ? "#fafbfc" : "#fff" }}
                    >
                      <td style={{ padding: "12px 14px", color: "#0f2a1e", fontWeight: 600 }}>
                        {r.product_name}
                        {r.is_own !== 1 && (
                          <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 8, padding: "1px 7px", borderRadius: 8, background: "#eef2ff", color: "#4f46e5" }}>경쟁사</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {r.supply_price != null ? r.supply_price.toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#0f2a1e", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {r.today_price != null ? r.today_price.toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: s?.color ?? "#9ca3af" }}>
                        {r.margin_pct != null ? `${r.margin_pct}%` : "—"}
                        {r.margin_dropped && <span style={{ marginLeft: 3 }}>▼</span>}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        {r.level ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 12px", borderRadius: 10, background: s!.bg, color: s!.color, border: `1px solid ${s!.border}` }}>
                            {r.level}
                          </span>
                        ) : <span style={{ fontSize: 11, color: "#c0c4cc" }}>공급가 미입력</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Sparkline history={r.history} color={s?.line ?? "#9ca3af"} />
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr style={{ borderBottom: "1px solid #f3f4f6", background: "#fafbfc" }}>
                        <td colSpan={6} style={{ padding: "16px 20px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f2a1e", marginBottom: 8 }}>
                            판매가 변동 (최근 30일) — BM 광고비 협상 근거 화면
                          </div>
                          <DetailChart history={r.history} supplyPrice={r.supply_price} />
                          <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                            <span>
                              마진율 추이:{" "}
                              {r.history.slice(-7).map(h => h.margin_pct != null ? `${h.margin_pct}%` : "—").join(" → ") || "—"}
                            </span>
                            <span>
                              아이템위너:{" "}
                              {r.is_item_winner == null ? "미확인" : r.is_item_winner ? "Y (위너)" : "N (비위너)"}
                            </span>
                            <span>마지막 확인: {r.last_checked_at ?? "—"}</span>
                            {r.coupang_url && (
                              <a href={r.coupang_url} target="_blank" rel="noreferrer" style={{ color: "#ef567c", textDecoration: "none", fontWeight: 600 }}>
                                쿠팡에서 보기 ↗
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
