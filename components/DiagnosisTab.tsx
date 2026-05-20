"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORE_KEY = "sellfit_store_id";
const STORE_INFO_KEY = "sellfit_store_info";

const DEFENSE_COEFF: Record<string, number> = {
  "압축팩": 1200, "다리미판": 2500, "유아매트": 5000, "화분": 1800,
};
const TIME_COEFF: Record<string, number> = {
  "safety": 5, "seo": 2, "price": 2, "other": 2,
};

interface ProductCard {
  product: string; category: string; action: string; target_tab: string;
  score: number; recommended_name?: string;
}
interface GroupedCard {
  type: "safety" | "seo" | "price" | "other";
  title: string; score: number; target_tab: string;
  items: (ProductCard & { checked: boolean });
  itemList: (ProductCard & { checked: boolean })[];
  defensePerDay: number;
}
interface FullAnalysisItem {
  product: string; category: string;
  analysis: {
    diagnosis_summary?: string;
    seo_miss?: { missing_attributes: string[]; recommended_names?: string[] };
    price_analysis?: { finding: string; action: string };
    hooking_copy?: string[];
    priority_routing?: {
      first?: { issue: string; score: number; target_tab: string; context_payload?: Record<string, unknown> };
    };
    safety_check?: { kc_in_name: boolean; safety_priority_forced: boolean; action: string };
  };
}
interface DiagnosisData {
  today: string;
  report: Record<string, unknown> | null;
  full_analysis: FullAnalysisItem[] | null;
  totals: { defended: number; actions: number; days: number };
  history: Record<string, unknown>[];
}

function formatWon(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "억원";
  if (n >= 10000) return Math.round(n / 10000) + "만원";
  return n.toLocaleString() + "원";
}
function getRiskEmoji(score: number) { return score >= 80 ? "🔴" : score >= 50 ? "🟡" : "🟢"; }

function groupCards(fa: FullAnalysisItem[]): { top3: GroupedCard[]; rest: GroupedCard[] } {
  const groups: GroupedCard[] = [];
  for (const item of fa) {
    const routing = item.analysis?.priority_routing;
    const safety = item.analysis?.safety_check;
    const base = { product: item.product, category: item.category, checked: false };
    if (item.category === "유아매트" && safety && !safety.kc_in_name) {
      const pc = { ...base, action: safety.action || "KC인증 키워드 상품명에 추가", target_tab: "seo", score: 98, recommended_name: item.analysis.seo_miss?.recommended_names?.[0] };
      groups.push({ type: "safety", title: `KC인증 누락 — ${item.product}`, score: 98, target_tab: "seo", items: pc, itemList: [pc], defensePerDay: DEFENSE_COEFF["유아매트"] });
      continue;
    }
    if (routing?.first?.issue) {
      const c = routing.first;
      const pc = { ...base, action: c.issue, target_tab: c.target_tab, score: c.score, recommended_name: item.analysis.seo_miss?.recommended_names?.[0] };
      const type = c.target_tab === "seo" ? "seo" : c.target_tab === "price" ? "price" : "other" as const;
      const existing = groups.find(g => g.type === type);
      if (existing) {
        existing.itemList.push(pc);
        existing.defensePerDay += DEFENSE_COEFF[item.category] || 1500;
        if (item.category === "압축팩") {
          existing.title = existing.title.replace(/— \d+개/, `— ${existing.itemList.length}개`);
          if (!existing.title.includes("개")) existing.title += ` — ${existing.itemList.length}개`;
        }
      } else {
        const label = type === "seo" ? `SEO 속성·상품명 누락 — ${item.product}` : type === "price" ? `가격 포지셔닝 — ${item.product}` : `최적화 — ${item.product}`;
        groups.push({ type, title: label, score: c.score, target_tab: c.target_tab, items: pc, itemList: [pc], defensePerDay: DEFENSE_COEFF[item.category] || 1500 });
      }
    }
  }
  // 그룹 타이틀 정리
  groups.forEach(g => {
    if (g.itemList.length > 1) {
      const base = g.type === "seo" ? "SEO 속성·상품명 누락" : g.type === "price" ? "가격 포지셔닝" : "최적화";
      g.title = `${base} — ${g.itemList.length}개 상품`;
    }
  });
  groups.sort((a, b) => b.score - a.score);
  return { top3: groups.slice(0, 3), rest: groups.slice(3) };
}

// ── Toast ─────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "#0f2a1e", color: "#00aa6c", padding: "12px 24px",
      borderRadius: 40, fontSize: 14, fontWeight: 700,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 9999,
      animation: "fadeInUp 0.2s ease",
    }}>
      {msg}
    </div>
  );
}

// ── 액션 요약 박스 ─────────────────────────────
function ActionSummaryBox({ top3, completedCount }: {
  top3: GroupedCard[]; completedCount: number;
}) {
  const totalMissions = top3.length;
  const totalMinutes = top3.reduce((s, g) => s + TIME_COEFF[g.type] * Math.max(1, g.itemList.length), 0);
  const totalMonthly = top3.reduce((s, g) => s + g.defensePerDay * 30, 0);
  const pct = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

  return (
    <div style={{
      background: "linear-gradient(135deg, #fef9c3, #fde68a)",
      borderRadius: 12, padding: "20px 24px", marginBottom: 16,
      border: "1px solid #fcd34d",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", letterSpacing: "0.08em", marginBottom: 8 }}>
        ⚡ 오늘의 액션 요약
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#78350f", marginBottom: 4 }}>
        {totalMissions}개 미션 · {totalMinutes}분 · {formatWon(totalMonthly)} 방어 예상
      </div>
      <div style={{ fontSize: 12, color: "#92400e", marginBottom: 12, opacity: 0.8 }}>
        월 기준 SellFit 추정값
      </div>
      {/* 진행률 바 */}
      <div style={{ background: "rgba(0,0,0,0.08)", borderRadius: 20, height: 8, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#f59e0b", borderRadius: 20,
          width: `${pct}%`, transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#92400e" }}>
        <span>{completedCount}/{totalMissions} 완료</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

// ── 위험 카드 ─────────────────────────────────
function GroupCard({ group, rank, reportId, onComplete, onToast, onSeoNavigate }: {
  group: GroupedCard; rank: number; reportId: string;
  onComplete: (amount: number) => void; onToast: (msg: string) => void;
  onSeoNavigate?: (keyword: string) => void;
}) {
  const [expanded, setExpanded] = useState(rank === 1);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [completing, setCompleting] = useState(false);

  const totalDefense = Array.from(checkedIds).reduce((s, i) => s + (DEFENSE_COEFF[group.itemList[i]?.category] || 1500), 0);
  const tabLabels: Record<string, string> = { price: "가격 탭", seo: "SEO 탭", ad: "광고 탭", customer: "고객 탭" };
  const rankColors = ["#ef4444", "#f59e0b", "#3b82f6", "#6b7280", "#9ca3af", "#d1d5db"];
  const rankBg = ["#fee2e2", "#fef3c7", "#dbeafe", "#f3f4f6", "#f9fafb", "#f9fafb"];
  const borderLeft = done ? "#22c55e" : group.score >= 90 ? "#ef4444" : group.score >= 70 ? "#f59e0b" : "#3b82f6";

  const handleComplete = async () => {
    if (checkedIds.size === 0 || done) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/diagnosis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, defended_amount: totalDefense }),
      });
      if (res.ok) {
        setDone(true);
        onComplete(totalDefense);
        onToast(`+${formatWon(totalDefense)} 방어 완료! 🎯`);
      }
    } catch { /* 무시 */ }
    setCompleting(false);
  };

  const handleCopy = async (text: string, productName: string, category: string) => {
    await navigator.clipboard?.writeText(text);
    // 이행 로깅
    fetch("/api/action-log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: reportId, action_type: "copy", product_name: productName, category }),
    }).catch(() => {});
  };

  return (
    <div style={{
      background: done ? "#f0fdf4" : "#fff",
      border: `1px solid ${done ? "#86efac" : group.score >= 90 ? "#fecaca" : group.score >= 70 ? "#fde68a" : "#bfdbfe"}`,
      borderLeft: `4px solid ${borderLeft}`,
      borderRadius: 10, marginBottom: 10, overflow: "hidden",
    }}>
      {/* 헤더 */}
      <div onClick={() => !done && setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: done ? "default" : "pointer" }}>
        {/* 순위 배지 */}
        <div style={{
          minWidth: 40, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
          background: done ? "#dcfce7" : rankBg[rank - 1], flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: done ? "#16a34a" : rankColors[rank - 1], letterSpacing: "0.04em" }}>
            {done ? "완료" : `${rank}순위`}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: done ? "#166534" : "#0f2a1e", marginBottom: 2 }}>
            {getRiskEmoji(group.score)} {group.title}
            {done && totalDefense > 0 && <span style={{ fontSize: 12, color: "#16a34a", marginLeft: 8 }}>+{formatWon(totalDefense)}</span>}
          </div>
          {/* 한 줄 진단 + 방어액 */}
          {!done && (
            <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
              {group.type === "safety" && `KC인증 키워드 추가하면 → +${formatWon(group.defensePerDay)}/일 방어 가능`}
              {group.type === "seo" && `상품명·키워드 보강하면 → +${formatWon(group.defensePerDay)}/일 방어 가능`}
              {group.type === "price" && `가격 구조 최적화하면 → +${formatWon(group.defensePerDay)}/일 방어 가능`}
              {group.type === "other" && `최적화 완료하면 → +${formatWon(group.defensePerDay)}/일 방어 가능`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {group.itemList.length > 1 && (
            <span style={{ fontSize: 10, color: "#9ca3af", background: "#f3f4f6", padding: "2px 6px", borderRadius: 10 }}>
              {group.itemList.length}개
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: group.score >= 90 ? "#fee2e2" : group.score >= 70 ? "#fef3c7" : "#dbeafe",
            color: group.score >= 90 ? "#dc2626" : group.score >= 70 ? "#d97706" : "#1d4ed8" }}>
            {group.score}점
          </span>
          {!done && <span style={{ fontSize: 14, color: "#9ca3af", transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(90deg)" : "none" }}>›</span>}
        </div>
      </div>

      {/* 펼침 */}
      {expanded && !done && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "grid", gap: 8, padding: "12px 0" }}>
            {group.itemList.map((item, i) => (
              <div key={i} onClick={() => {
                const next = new Set(checkedIds);
                next.has(i) ? next.delete(i) : next.add(i);
                setCheckedIds(next);
              }}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px",
                  background: checkedIds.has(i) ? "#f0fdf4" : "#f9fafb", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${checkedIds.has(i) ? "#86efac" : "#e5e7eb"}` }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checkedIds.has(i) ? "#22c55e" : "#d1d5db"}`,
                  background: checkedIds.has(i) ? "#22c55e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2 }}>
                  {checkedIds.has(i) && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2a1e", marginBottom: 2 }}>
                    {item.product} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({item.category})</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{item.action}</div>
                  {item.recommended_name && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4,
                      background: "#fff", border: "1px solid #e0ede9", borderRadius: 6, padding: "6px 10px" }}>
                      <span style={{ fontSize: 11, color: "#00aa6c", flex: 1, marginRight: 8 }}>{item.recommended_name}</span>
                      <button onClick={e => { e.stopPropagation(); handleCopy(item.recommended_name!, item.product, item.category); }}
                        style={{ fontSize: 10, color: "#00aa6c", background: "#e8f5f0", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", flexShrink: 0 }}>
                        복사
                      </button>
                    </div>
                  )}
                </div>
                {checkedIds.has(i) && <span style={{ fontSize: 11, color: "#16a34a", flexShrink: 0 }}>+{formatWon(DEFENSE_COEFF[item.category] || 1500)}</span>}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={e => {
                e.stopPropagation();
                if (group.target_tab === "seo" && onSeoNavigate) {
                  onSeoNavigate(group.itemList[0]?.product ?? "");
                } else {
                  window.location.hash = group.target_tab;
                }
              }}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#0f2a1e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {tabLabels[group.target_tab] || group.target_tab}에서 즉시 수정 →
            </button>
            {checkedIds.size > 0 && (
              <button onClick={e => { e.stopPropagation(); handleComplete(); }} disabled={completing}
                style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #e0ede9", background: "#fff", fontSize: 12, color: "#6b7280", cursor: "pointer", fontWeight: 600 }}>
                {completing ? "..." : `✓ ${checkedIds.size}개 완료`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 게릴라 분석 모달 ─────────────────────────
function GerillaModal({ onClose }: { onClose: () => void }) {
  const [nameA, setNameA] = useState("");
  const [kwA, setKwA] = useState("");
  const [priceA, setPriceA] = useState("");
  const [reviewA, setReviewA] = useState("");
  const [nameB, setNameB] = useState("");
  const [kwB, setKwB] = useState("");
  const [priceB, setPriceB] = useState("");
  const [reviewB, setReviewB] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!nameA || !nameB) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compare-products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productA: { name: nameA, keyword: kwA, price: priceA, reviews: parseInt(reviewA) || 0, category: "압축팩" },
          productB: { name: nameB, keyword: kwB, price: priceB, reviews: parseInt(reviewB) || 0, category: "압축팩" },
        }),
      });
      setResult(await res.json());
    } catch { /* 무시 */ }
    setLoading(false);
  };

  const analysis = result?.analysis as string | undefined;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f2a1e" }}>🔥 경쟁사 게릴라 분석</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>30초 만에 격차를 분석합니다</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {!result ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "상품 A (우리 상품)", name: nameA, setName: setNameA, kw: kwA, setKw: setKwA, price: priceA, setPrice: setPriceA, review: reviewA, setReview: setReviewA, color: "#ef4444" },
                  { label: "상품 B (경쟁사)", name: nameB, setName: setNameB, kw: kwB, setKw: setKwB, price: priceB, setPrice: setPriceB, review: reviewB, setReview: setReviewB, color: "#00aa6c" },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 10 }}>{s.label}</div>
                    {[
                      { label: "상품명 *", val: s.name, set: s.setName, ph: "예) 이지백 압축팩" },
                      { label: "키워드", val: s.kw, set: s.setKw, ph: "예) 압축팩" },
                      { label: "가격 (원)", val: s.price, set: s.setPrice, ph: "12900" },
                      { label: "리뷰 수", val: s.review, set: s.setReview, ph: "1240" },
                    ].map((f, j) => (
                      <div key={j} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3 }}>{f.label}</div>
                        <input value={f.val} onChange={e => f.set(e.target.value)}
                          placeholder={f.ph}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e0ede9", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <button onClick={run} disabled={loading || !nameA || !nameB}
                style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none",
                  background: loading ? "#9ca3af" : "#0f2a1e", color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {loading ? "게릴라 분석 중... (DataLab + Gemini)" : "🔥 격차 분석 시작"}
              </button>
            </>
          ) : (
            <div>
              <div style={{ background: "#0f2a1e", borderRadius: 10, padding: "20px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, letterSpacing: "0.1em" }}>게릴라 분석 결과</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.9 }}
                  dangerouslySetInnerHTML={{ __html: (analysis || "").replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e8f5f0">$1</strong>').replace(/\n/g, "<br>") }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 0 }}>
                <button onClick={() => setResult(null)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e0ede9", background: "#fff", fontSize: 13, color: "#6b7280", cursor: "pointer" }}>
                  다시 분석
                </button>
                <button onClick={() => {
                  localStorage.setItem("sellfit_prefill_competitor", JSON.stringify({ name: nameB, keyword: kwB, price: priceB }));
                  onClose();
                  window.location.hash = "setup";
                }}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#0f2a1e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  📌 이 경쟁사 매일 추적하기 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────
export default function DiagnosisTab({ onSeoNavigate }: { onSeoNavigate?: (keyword: string) => void }) {
  const [data, setData] = useState<DiagnosisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [totalDefended, setTotalDefended] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [showGerilla, setShowGerilla] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const loadDiagnosis = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/diagnosis?store_id=${sid}`);
      const json: DiagnosisData = await res.json();
      setData(json);
      setTotalDefended(json.totals.defended);
      setCompletedCount(json.totals.actions);
    } catch { /* 무시 */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const sid = localStorage.getItem(STORE_KEY);
    const info = localStorage.getItem(STORE_INFO_KEY);
    if (sid) {
      setStoreId(sid);
      if (info) setStoreName(JSON.parse(info).name || "");
      loadDiagnosis(sid);
    } else setLoading(false);
  }, [loadDiagnosis]);

  const handleInstantDiagnosis = async () => {
    if (!storeId) return;
    setAnalyzing(true);
    try {
      await fetch("/api/db/migrate", { method: "POST" });
      await fetch("/api/pregenerate", { method: "POST", headers: { Authorization: "Bearer sellfit-cron-2026" } });
      await loadDiagnosis(storeId);
    } catch { /* 무시 */ }
    setAnalyzing(false);
  };

  const handleActionComplete = (amount: number) => {
    setTotalDefended(prev => prev + amount);
    setCompletedCount(prev => prev + 1);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: 13 }}>불러오는 중...</div>;

  if (!storeId) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>📌 설정 탭에서 스토어를 먼저 등록해주세요.</div>
    </div>
  );

  const riskScore = data?.report ? Number(data.report.risk_score) : 0;
  const { top3, rest } = data?.full_analysis ? groupCards(data.full_analysis) : { top3: [], rest: [] };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      {toast && <Toast msg={toast} />}
      {showGerilla && <GerillaModal onClose={() => setShowGerilla(false)} />}

      {/* 스코어보드 */}
      <div style={{ background: "#0f2a1e", borderRadius: 12, padding: "20px 24px", marginBottom: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", marginBottom: 6 }}>
            {storeName} · SellFit 누적 방어액
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#00aa6c", lineHeight: 1 }}>{formatWon(totalDefended)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            {data?.totals.days || 0}일 · {completedCount}개 완료 · SellFit 추정값
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>오늘 위험도</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: riskScore >= 70 ? "#ef4444" : riskScore >= 50 ? "#f59e0b" : "#00aa6c" }}>{riskScore}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{data?.today}</div>
          </div>
          <button onClick={() => setShowGerilla(true)}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
              borderRadius: 8, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const }}>
            🔥 게릴라 분석
          </button>
        </div>
      </div>

      {/* 진단 없을 때 */}
      {!data?.report && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "40px", textAlign: "center" as const, marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f2a1e", marginBottom: 8 }}>오늘 진단이 아직 없어요</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.7 }}>
            지금 바로 분석하면 SEO·가격·고객 즉시 진단 가능합니다.<br />
            DataLab + SearchAd + Gemini MD 분석.
          </div>
          {analyzing ? (
            <div style={{ fontSize: 13, color: "#00aa6c" }}>
              <div style={{ marginBottom: 8 }}>🔄 분석 진행 중...</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>DataLab → SearchAd → Gemini MD → 완료</div>
            </div>
          ) : (
            <button onClick={handleInstantDiagnosis}
              style={{ background: "#0f2a1e", color: "#fff", border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              ✨ 지금 분석 시작하기
            </button>
          )}
        </div>
      )}

      {/* 액션 요약 박스 */}
      {data?.report && top3.length > 0 && (
        <ActionSummaryBox top3={top3} completedCount={completedCount} />
      )}

      {/* Top 3 위험 카드 */}
      {data?.report && top3.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 10 }}>
            오늘의 액션 {top3.length}개
          </div>
          {top3.map((group, i) => (
            <GroupCard key={i} group={group} rank={i + 1} reportId={String(data.report!.id)}
              onComplete={handleActionComplete} onToast={showToast} onSeoNavigate={onSeoNavigate} />
          ))}
        </div>
      )}

      {/* 더 보기 */}
      {data?.report && (
        <div style={{ marginBottom: 16 }}>
          {rest.length > 0 ? (
            <>
              <button onClick={() => setShowRest(!showRest)}
                style={{ width: "100%", padding: "10px", background: "transparent", border: "1px solid #e0ede9", borderRadius: 8, fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                {showRest ? "▲ 접기" : `▼ 추가 액션 ${rest.length}개 더 보기`}
              </button>
              {showRest && rest.map((group, i) => (
                <div key={i} style={{ marginTop: 8 }}>
                  <GroupCard group={group} rank={top3.length + i + 1} reportId={String(data.report!.id)}
                    onComplete={handleActionComplete} onToast={showToast} onSeoNavigate={onSeoNavigate} />
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#9ca3af", lineHeight: 1.7 }}>
              💡 위 액션 완료 후 다음 우선순위 카드가 자동 등장합니다.<br />
              가격·썸네일·리뷰 카드는 데이터 누적(2~3일)으로 정밀도가 높아져요.
            </div>
          )}
        </div>
      )}

      {/* 7일 이력 */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "20px" }}>
        <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 12 }}>최근 7일 이력</div>
        {data?.history && data.history.length > 1 ? (
          data.history.map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < data.history.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 13 }}>
              <span style={{ color: "#6b7280" }}>{String(h.report_date)}</span>
              <span style={{ color: "#0f2a1e" }}>{getRiskEmoji(Number(h.risk_score))} {Number(h.risk_score)}점</span>
              <span style={{ color: "#00aa6c" }}>+{formatWon(Number(h.defended_amount || 0))}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.8 }}>
            📅 매일 새벽 2시 자동 수집 후 채워집니다.<br />
            오늘이 첫날이에요. 내일부터 위험도 변화·방어액 누적이 여기 쌓여요.<br />
            <span style={{ color: "#d1d5db" }}>예) 05-19 🔴 80점 +1.2만원 / 05-20 🟡 55점 +0.8만원</span>
          </div>
        )}
      </div>
    </div>
  );
}
