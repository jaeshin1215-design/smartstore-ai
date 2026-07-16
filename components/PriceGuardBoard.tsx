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
  margin_warn_pct: number | null;
  margin_danger_pct: number | null;
  fee_rate: number | null;      // 쿠팡 수수료율(%) 카테고리 참고값
  fee_confirmed: boolean;       // true=확정 / false=추정(참고값)
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

// 스팟(변곡점) 판정 — 직전 대비 가격 방향이 바뀌는 지점 + 양 끝
function isSpot(pts: HistoryPoint[], i: number): boolean {
  if (i === 0 || i === pts.length - 1) return true;
  const a = pts[i - 1].price, b = pts[i].price, c = pts[i + 1].price;
  return (b - a) === 0 || Math.sign(b - a) !== Math.sign(c - b);
}

function shortDate(d: string) { const m = d.match(/(\d{2})-(\d{2})$/); return m ? `${m[1]}/${m[2]}` : d; }

// 수수료율 참고값 라벨 (옅은 회색·작게 — 실캡처값과 성격 구분)
function feeLabel(feeRate: number | null, feeConfirmed: boolean): string | null {
  if (feeRate == null) return null;
  return feeConfirmed ? `${feeRate}%` : `${feeRate}% (참고값)`;
}

function DetailChart({ history, supplyPrice, marginWarn, marginDanger, feeRate, feeConfirmed }: { history: HistoryPoint[]; supplyPrice: number | null; marginWarn: number | null; marginDanger: number | null; feeRate: number | null; feeConfirmed: boolean }) {
  const points = history.slice(-30);
  const [activeIdx, setActiveIdx] = useState<number | null>(null); // 툴팁 대상 (호버/탭)
  const [showTable, setShowTable] = useState(false);
  const fee = feeLabel(feeRate, feeConfirmed);

  if (points.length < 2) {
    return <div style={{ fontSize: 12, color: "#9ca3af", padding: "16px 0" }}>그래프는 2일 이상 수집 후 표시됩니다.</div>;
  }
  const w = 560, h = 150, padX = 44, padY = 20;
  const prices = points.map(p => p.price);
  const min = Math.min(...prices, supplyPrice ?? Infinity);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const x = (i: number) => padX + (i / (points.length - 1)) * (w - padX - 12);
  const y = (v: number) => padY + (1 - (v - min) / range) * (h - padY * 2);
  const line = points.map((p, i) => `${x(i)},${y(p.price)}`).join(" ");

  // 마진율이 판정선(주의/위험) 아래인지
  const belowThreshold = (m: number | null) =>
    m != null && ((marginDanger != null && m < marginDanger) || (marginWarn != null && m < marginWarn));

  const at = activeIdx != null ? points[activeIdx] : null;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}
        onMouseLeave={() => setActiveIdx(null)}>
        {/* 공급가 기준선 */}
        {supplyPrice != null && supplyPrice >= min && supplyPrice <= max && (
          <>
            <line x1={padX} y1={y(supplyPrice)} x2={w - 12} y2={y(supplyPrice)} stroke="#c0c4cc" strokeDasharray="4 3" strokeWidth={1} />
            <text x={w - 12} y={y(supplyPrice) - 4} fontSize={10} fill="#9ca3af" textAnchor="end">공급가 {supplyPrice.toLocaleString()}</text>
          </>
        )}
        <polyline points={line} fill="none" stroke="#ef567c" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* 데이터 포인트 — 스팟은 크게, 활성 포인트 강조. 호버/탭 히트영역 넓게 */}
        {points.map((p, i) => {
          const spot = isSpot(points, i);
          const active = activeIdx === i;
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.price)} r={active ? 5 : spot ? 3.5 : 2.5}
                fill={belowThreshold(p.margin_pct) ? "#dc2626" : "#ef567c"}
                stroke={active ? "#fff" : "none"} strokeWidth={active ? 1.5 : 0} />
              {/* 넓은 투명 히트영역 (호버/탭) */}
              <circle cx={x(i)} cy={y(p.price)} r={12} fill="transparent" style={{ cursor: "pointer" }}
                onMouseEnter={() => setActiveIdx(i)} onClick={() => setActiveIdx(active ? null : i)} />
            </g>
          );
        })}

        {/* 최소·최대 라벨 */}
        <text x={0} y={y(max) + 4} fontSize={10} fill="#6b7280">{max.toLocaleString()}</text>
        {(supplyPrice == null || Math.abs(y(min) - y(supplyPrice)) > 12) && (
          <text x={0} y={y(min) + 4} fontSize={10} fill="#6b7280">{min.toLocaleString()}</text>
        )}

        {/* 툴팁 — 활성 포인트: 일자·판매가·마진율(실캡처) + 수수료율(카테고리 참고값·옅은색) */}
        {at && (() => {
          const boxH = fee ? 58 : 44;
          const boxW = fee ? 128 : 106;
          const tx = Math.min(Math.max(x(activeIdx!) - boxW / 2, 2), w - boxW - 2);
          const ty = Math.max(y(at.price) - boxH - 8, 2);
          return (
            <g pointerEvents="none">
              <line x1={x(activeIdx!)} y1={padY} x2={x(activeIdx!)} y2={h - padY} stroke="#e5e7eb" strokeWidth={1} />
              <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill="#111827" opacity={0.92} />
              <text x={tx + 8} y={ty + 15} fontSize={10} fill="#fff" fontWeight={700}>{shortDate(at.check_date)}</text>
              <text x={tx + 8} y={ty + 28} fontSize={10} fill="#e5e7eb">판매가 {at.price.toLocaleString()}원</text>
              <text x={tx + 8} y={ty + 39} fontSize={10} fill={belowThreshold(at.margin_pct) ? "#fca5a5" : "#86efac"}>
                마진율 {at.margin_pct != null ? `${at.margin_pct}%` : "—"}
              </text>
              {fee && (
                <text x={tx + 8} y={ty + 51} fontSize={9} fill="#9ca3af">수수료 {fee}</text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* 접이식 가격 이력 테이블 — 협상 근거 스크린샷용 */}
      <button onClick={() => setShowTable(v => !v)}
        style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#6b7280", background: "none", border: "1px solid #e8eaed", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>
        {showTable ? "이력 접기 ▲" : "이력 보기 ▼"}
      </button>
      {showTable && (
        <div style={{ marginTop: 10, border: "1px solid #eef0f2", borderRadius: 8, overflow: "hidden" }}>
          {/* 수수료율 — 카테고리 참고값(옅은색·작게). 판매가·마진율(실캡처)과 성격 구분 */}
          {fee && (
            <div style={{ padding: "6px 12px", background: "#fafbfc", borderBottom: "1px solid #eef0f2", fontSize: 11, color: "#9ca3af" }}>
              쿠팡 판매수수료율 <span style={{ fontWeight: 700, color: "#6b7280" }}>{fee}</span>
              <span style={{ marginLeft: 6 }}>· 카테고리 기준{feeConfirmed ? "" : " 추정값"} (실캡처값 아님)</span>
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e8eaed" }}>
                {["일자", "판매가", "전일대비", "마진율"].map(hd => (
                  <th key={hd} style={{ textAlign: hd === "일자" ? "left" : "right", padding: "7px 12px", fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.slice().reverse().map((p, ri) => {
                const idx = points.length - 1 - ri;
                const prev = idx > 0 ? points[idx - 1].price : null;
                const diff = prev != null ? p.price - prev : null;
                const below = belowThreshold(p.margin_pct);
                return (
                  <tr key={p.check_date} style={{ borderBottom: "1px solid #f3f4f6", background: below ? "#fff1f2" : "#fff" }}>
                    <td style={{ padding: "7px 12px", color: "#374151", whiteSpace: "nowrap" }}>{shortDate(p.check_date)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: "#0f2a1e", fontWeight: 600, whiteSpace: "nowrap" }}>{p.price.toLocaleString()}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", whiteSpace: "nowrap", color: diff == null ? "#c0c4cc" : diff < 0 ? "#dc2626" : diff > 0 ? "#2563eb" : "#9ca3af" }}>
                      {diff == null ? "—" : diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff.toLocaleString()}`}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: below ? "#dc2626" : "#374151" }}>
                      {p.margin_pct != null ? `${p.margin_pct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
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

      {/* 매입가 미등록 안내 (2026-07-16 쿠팡 상품리스트 신규 등록분) — 마진율 미표시 사유 + 중복 가능성 */}
      {(() => {
        // 매입가 없음(공급가 0/null)과 "매입가는 있으나 아직 수집 전"은 다른 사유 — 섞지 않는다
        const noCost = rows.filter(r => r.supply_price == null || r.supply_price === 0).length;
        if (noCost === 0) return null;
        return (
          <div style={{
            background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8,
            padding: "9px 14px", marginBottom: 12, fontSize: 11, color: "#c2410c", lineHeight: 1.7,
          }}>
            ⓘ <b>{noCost}건은 매입가가 없어 마진율이 표시되지 않습니다</b> — 판매가·아이템위너만 추적됩니다.
            쿠팡 상품리스트로 신규 등록한 상품이며, <b>기존 등록 상품과 중복일 수 있습니다</b>(상품명 표기 체계가 달라 자동 매칭 불가).
            매입가 매핑·중복 정리는 이다슬 프로 확인 후 진행 예정입니다.
          </div>
        );
      })()}

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
                        ) : r.supply_price == null ? (
                          // 공급가 자체가 없을 때만 "공급가 미입력"
                          <span style={{ fontSize: 11, color: "#c0c4cc" }}>공급가 미입력</span>
                        ) : (
                          // 공급가는 있는데 아직 판매가 수집 전 (2026-07-10 오표기 수정)
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>수집 전</span>
                        )}
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
                          <DetailChart history={r.history} supplyPrice={r.supply_price} marginWarn={r.margin_warn_pct} marginDanger={r.margin_danger_pct} feeRate={r.fee_rate} feeConfirmed={r.fee_confirmed} />
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
