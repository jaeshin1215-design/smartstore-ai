"use client";

import { useState, useEffect } from "react";

// ── Color system (Discover와 동일) ────────────────────────────────────────────
const PINK = { main: "#D4537E", mid: "#E89CB8", light: "#FBEAF0", text: "#993556" };
const CARD_STYLE: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8eaed",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

// ── 12개월 시나리오 (설계서 6-2 기준) ────────────────────────────────────────
interface MonthPlan {
  theme: string;
  mainCategory: string;       // 이달 집중 상시
  seasonSpice: string | null; // 시즌 양념
  focusKeywords: string[];    // 핵심 키워드
  season: "spring"|"summer"|"fall"|"winter";
}

const MONTH_PLANS: MonthPlan[] = [
  { theme:"신학기 수납의 달",      mainCategory:"수납·정리함",      seasonSpice:"이사철 압축팩",      focusKeywords:["수납함","정리함","신학기"],  season:"winter"  },
  { theme:"새해 정리의 달",        mainCategory:"수납·정리함",      seasonSpice:"압축팩",             focusKeywords:["수납함","정리함"],           season:"winter"  },
  { theme:"이사철 수납의 달",      mainCategory:"수납·압축팩",      seasonSpice:"압축팩 피크",        focusKeywords:["압축팩","이사철","정리함"],  season:"spring"  },
  { theme:"봄 정리의 달",          mainCategory:"수납·다리미판",    seasonSpice:null,                 focusKeywords:["다리미판","수납함"],         season:"spring"  },
  { theme:"장마 전 건조의 달",     mainCategory:"빨래건조대",       seasonSpice:null,                 focusKeywords:["빨래건조대","건조대"],       season:"spring"  },
  { theme:"여름 건조·제습의 달",   mainCategory:"빨래건조대·수납",  seasonSpice:null,                 focusKeywords:["빨래건조대","제습","수납"],  season:"summer"  },
  { theme:"장마 피크 건조의 달",   mainCategory:"빨래건조대",       seasonSpice:null,                 focusKeywords:["빨래건조대","장마"],         season:"summer"  },
  { theme:"환절기 이불정리의 달",  mainCategory:"압축팩·이불정리",  seasonSpice:"압축팩 피크",        focusKeywords:["압축팩","이불정리","환절기"],season:"summer"  },
  { theme:"가을 수납 정리의 달",   mainCategory:"수납·정리함",      seasonSpice:null,                 focusKeywords:["수납함","정리함","가을"],    season:"fall"    },
  { theme:"방한 준비의 달",        mainCategory:"수납·방한",        seasonSpice:"카카오 방한장갑",    focusKeywords:["방한","수납함","카카오"],    season:"fall"    },
  { theme:"연말 정리의 달",        mainCategory:"수납·연말",        seasonSpice:"카카오 IP 연말",     focusKeywords:["연말정리","카카오IP","방한"],season:"fall"    },
  { theme:"내년 선기획의 달",      mainCategory:"수납·연말선기획",  seasonSpice:"카카오 IP 캘린더",   focusKeywords:["카카오캘린더","수납함","신학기선기획"], season:"winter" },
];

const MONTH_EN = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const SEASON_KR: Record<string, string> = { spring:"봄", summer:"여름", fall:"가을", winter:"겨울" };

// 상시 본체 (연중 고정) — 설계서 6-1
const EVERGREEN_ITEMS = ["수납·정리함", "빨래건조대", "다리미판", "밀폐용기"];

// 카테고리 → 해당 월 관련도 (캘린더 신호용)
function getRelevantMonths(category: string): number[] {
  const c = category.toLowerCase();
  if (c.includes("압축팩")) return [1, 2, 3, 8];
  if (c.includes("빨래건조대")) return [5, 6, 7, 8];
  if (c.includes("다리미판")) return [4, 5, 9];
  if (c.includes("카카오ip") || c.includes("카카오")) return [10, 11, 12];
  if (c.includes("수납") || c.includes("정리")) return [1, 2, 3, 4, 9, 10, 11, 12];
  if (c.includes("밀폐") || c.includes("냉장")) return [6, 7, 8, 9];
  return [];
}

// 4사분면 분류 (설계서 4번)
function getQuadrant(x: number, y: number): "major"|"quick"|"thankless"|"fillin" {
  if (x >= 50 && y >= 50) return "major";
  if (x < 50  && y >= 50) return "quick";
  if (x >= 50 && y < 50)  return "thankless";
  return "fillin";
}

interface Product {
  id: string;
  name: string;
  category: string;
  matrix_x: number | null;
  matrix_y: number | null;
  price: number;
  is_own: number;
}

interface MonthDetail {
  monthIdx: number; // 0-based
  plan: MonthPlan;
  products: Product[];
}

function ThisWeekTodos({ plan }: { plan: MonthPlan }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  const todos = [
    { key:"t1", label:`${plan.focusKeywords[0] ?? "주력 상품"} 재고 수준 확인`, icon:"📦" },
    { key:"t2", label:"효자 상품 광고 예산 배분 점검", icon:"💰" },
    { key:"t3", label:"전주 대비 마진율 변동 체크", icon:"📊" },
    ...(plan.seasonSpice ? [{ key:"t4", label:`${plan.seasonSpice} 시즌 대비 재고 선확보`, icon:"🌶" }] : []),
  ];

  const doneCount = todos.filter(t => checked[t.key]).length;

  return (
    <div style={{ background:"#fff", border:"1px solid #e8eaed", borderRadius:"12px", padding:"20px 24px", marginBottom:"28px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
        <div>
          <p style={{ fontSize:"10px", fontWeight:600, color:"#9ca3af", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 4px" }}>THIS WEEK · AI 액션</p>
          <p style={{ fontSize:"15px", fontWeight:700, color:"#111", margin:0 }}>이번 주 할 일</p>
        </div>
        <span style={{ fontSize:"12px", fontWeight:600, padding:"3px 10px", borderRadius:"20px", background: doneCount === todos.length ? PINK.light : "#f3f4f6", color: doneCount === todos.length ? PINK.text : "#9ca3af" }}>
          {doneCount}/{todos.length} 완료
        </span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {todos.map(t => (
          <div key={t.key} onClick={() => toggle(t.key)} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", borderRadius:"8px", background: checked[t.key] ? PINK.light : "#f9fafb", border:`1px solid ${checked[t.key] ? PINK.mid : "#f0f0f0"}`, cursor:"pointer", transition:"all 0.15s" }}>
            <div style={{ width:"20px", height:"20px", borderRadius:"5px", border:`1.5px solid ${checked[t.key] ? PINK.main : "#d1d5db"}`, background: checked[t.key] ? PINK.main : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
              {checked[t.key] && <span style={{ fontSize:"11px", color:"#fff", fontWeight:700 }}>✓</span>}
            </div>
            <span style={{ fontSize:"13px", color:"#6b7280", marginRight:"6px" }}>{t.icon}</span>
            <span style={{ fontSize:"13px", fontWeight: checked[t.key] ? 400 : 500, color: checked[t.key] ? "#9ca3af" : "#374151", textDecoration: checked[t.key] ? "line-through" : "none", flex:1 }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarTab() {
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [detail, setDetail] = useState<MonthDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const currentMonth = new Date().getMonth(); // 0-based

  useEffect(() => {
    const storeId = localStorage.getItem("sellfit_store_id");
    if (!storeId) return;
    fetch(`/api/products?store_id=${storeId}`)
      .then(r => r.json())
      .then((j: { products?: Product[] }) => {
        setProducts((j.products ?? []).filter(p => p.is_own >= 1));
      })
      .catch(() => {});
  }, []);

  // 월별 상품 분류
  function getMonthProducts(monthIdx: number): Product[] {
    return products.filter(p => {
      const mx = p.matrix_x ?? 50;
      const my = p.matrix_y ?? 50;
      const q = getQuadrant(mx, my);
      if (q === "fillin") return false; // 올림 제외
      const relevant = getRelevantMonths(p.category);
      return relevant.includes(monthIdx + 1) || relevant.length === 0;
    });
  }

  // 월별 진단 신호
  function getDiagSignal(monthIdx: number): { stars: number; drops: number } {
    const ps = products.filter(p => {
      const q = getQuadrant(p.matrix_x ?? 50, p.matrix_y ?? 50);
      return getRelevantMonths(p.category).includes(monthIdx + 1) && q !== "fillin";
    });
    const stars = ps.filter(p => getQuadrant(p.matrix_x ?? 50, p.matrix_y ?? 50) === "major").length;
    const drops = products.filter(p => getQuadrant(p.matrix_x ?? 50, p.matrix_y ?? 50) === "fillin" && getRelevantMonths(p.category).includes(monthIdx + 1)).length;
    return { stars, drops };
  }

  if (detail) {
    return <MonthDetailView detail={detail} onBack={() => setDetail(null)} />;
  }

  const visibleMonths = monthFilter !== null
    ? MONTH_PLANS.map((p, i) => ({ plan: p, idx: i })).filter(m => m.idx === monthFilter - 1)
    : MONTH_PLANS.map((p, i) => ({ plan: p, idx: i }));

  return (
    <div style={{ fontFamily:"'Pretendard', -apple-system, sans-serif", color:"#111" }}>
      <div style={{ display:"flex", gap:"40px", alignItems:"flex-start" }}>

        {/* ── 좌측 사이드바 (sticky) ── */}
        <div style={{ width:"200px", flexShrink:0, background:"#F7F8FA", borderRadius:"8px", padding:"14px 12px", borderRight:"1px solid #e8eaed", position:"sticky", top:"60px" }}>
          <p style={{ fontSize:"10px", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em", color:"#9ca3af", marginBottom:"8px" }}>CALENDAR</p>
          <p style={{ fontSize:"14px", fontWeight:700, color:"#1a1a1a", lineHeight:1.4, marginBottom:"6px" }}>1년을 진단하며<br/>굴린다</p>
          <p style={{ fontSize:"13px", color:"#6b7280", marginBottom:"14px", lineHeight:1.5 }}>상시가 본체, 시즌은 양념</p>
          {["키우기 — 효자 집중", "걸러내기 — 드롭 후보", "들이기 — 신규 시즌", "채널 — 집중 배분"].map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"7px" }}>
              <span style={{ fontSize:"10px", color:"#c0c4cc", flexShrink:0 }}>✓</span>
              <span style={{ fontSize:"13px", color:"#8f9399" }}>{f}</span>
            </div>
          ))}

          {/* CATEGORY 필터 */}
          <div style={{ marginTop:"20px", borderTop:"1px solid #e8eaed", paddingTop:"14px" }}>
            <p style={{ fontSize:"10px", fontWeight:600, color:"#9ca3af", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"10px" }}>FILTER</p>
            <button
              onClick={() => setMonthFilter(null)}
              style={{ width:"100%", textAlign:"left", padding:"5px 8px", borderRadius:"6px", fontSize:"12px", fontWeight:monthFilter===null?700:400, background:monthFilter===null?PINK.light:"transparent", color:monthFilter===null?PINK.text:"#6b7280", border:"none", cursor:"pointer", marginBottom:"2px", fontFamily:"inherit" }}
            >
              ALL
            </button>
            {MONTH_KR.map((m, i) => (
              <button
                key={m}
                onClick={() => setMonthFilter(i + 1)}
                style={{ width:"100%", textAlign:"left", padding:"5px 8px", borderRadius:"6px", fontSize:"12px", fontWeight:monthFilter===i+1?700:400, background:monthFilter===i+1?PINK.light:"transparent", color:monthFilter===i+1?PINK.text:i===currentMonth?"#1a1a1a":"#6b7280", border:"none", cursor:"pointer", marginBottom:"2px", fontFamily:"inherit" }}
              >
                {m}{i === currentMonth ? " ★" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* ── 우측 본문 ── */}
        <div style={{ flex:1, minWidth:0 }}>
        <div style={{ maxWidth: "1232px", margin: "0 auto" }}>
          {/* Hero */}
          <div style={{ paddingBottom:"28px", marginBottom:"28px", borderBottom:"1px solid #e8eaed" }}>
            <h1 style={{ fontSize:"28px", fontWeight:800, letterSpacing:"-0.02em", color:"#0d0d0e", margin:"0 0 6px" }}>Annual Strategy.</h1>
            <p style={{ fontSize:"14px", color:"#4b5563", margin:"0 0 10px", lineHeight:1.6 }}>1년을 진단하며 굴린다.</p>
            <p style={{ fontSize:"14px", color:"#4b5563", margin:0, lineHeight:1.6 }}>상시가 본체다. AI가 마진·수요로 상품을 줄 세우고, 실데이터로 다시 세운다. 키울지 내릴지만 정하면 된다.</p>
          </div>

          {/* D-day 띠 */}
          {(() => {
            const upcoming = MONTH_PLANS.map((p, i) => ({ plan: p, idx: i }))
              .filter(({ plan, idx }) => plan.seasonSpice && idx >= currentMonth)
              .slice(0, 3);
            if (upcoming.length === 0) return null;
            return (
              <div style={{ display:"flex", gap:"10px", marginBottom:"24px", overflowX:"auto", paddingBottom:"4px" }}>
                {upcoming.map(({ plan, idx }) => {
                  const daysLeft = (idx - currentMonth) * 30;
                  const isThisMonth = idx === currentMonth;
                  return (
                    <div key={idx} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px", borderRadius:"10px", background: isThisMonth ? PINK.light : "#F7F8FA", border:`1px solid ${isThisMonth ? PINK.mid : "#e8eaed"}` }}>
                      <span style={{ fontSize:"18px" }}>🌶</span>
                      <div>
                        <p style={{ fontSize:"12px", fontWeight:700, color: isThisMonth ? PINK.text : "#374151", margin:"0 0 2px" }}>{plan.seasonSpice}</p>
                        <p style={{ fontSize:"12px", color:"#6b7280", margin:0 }}>{isThisMonth ? "이번 달" : `약 ${daysLeft}일 후`} · {MONTH_KR[idx]}</p>
                      </div>
                      {isThisMonth && <span style={{ fontSize:"11px", fontWeight:700, padding:"2px 8px", background:PINK.main, color:"#fff", borderRadius:"20px" }}>NOW</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 이번 주 할 일 */}
          <ThisWeekTodos plan={MONTH_PLANS[currentMonth]} />

          {/* 상시 본체 띠 */}
          <div style={{ background:"#F7F8FA", border:"1px solid #e8eaed", borderRadius:"10px", padding:"14px 20px", marginBottom:"28px", display:"flex", alignItems:"center", gap:"12px" }}>
            <span style={{ fontSize:"11px", fontWeight:700, color:"#6b7280", letterSpacing:"0.06em", textTransform:"uppercase", flexShrink:0 }}>연중 상시 본체</span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {EVERGREEN_ITEMS.map(item => (
                <span key={item} style={{ fontSize:"12px", fontWeight:600, padding:"3px 12px", borderRadius:"20px", background:"#fff", border:"1px solid #e8eaed", color:"#374151" }}>{item}</span>
              ))}
            </div>
          </div>

          {/* 미배정 대기열 (Discover에서 넘어온 발굴 예정 후보) */}
          {products.filter(p => (p.matrix_x == null || p.matrix_y == null) && p.is_own === 2).length > 0 && (
            <div style={{ ...CARD_STYLE, padding:"16px 20px", marginBottom:"24px", borderLeft:`3px solid ${PINK.main}` }}>
              <p style={{ fontSize:"12px", fontWeight:700, color:PINK.text, margin:"0 0 8px" }}>📥 배정 대기 — Discover에서 발굴된 후보</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {products.filter(p => (p.matrix_x == null || p.matrix_y == null) && p.is_own === 2).map(p => (
                  <span key={p.id} style={{ fontSize:"11px", padding:"2px 10px", background:PINK.light, color:PINK.text, borderRadius:"12px" }}>{p.name.length > 20 ? p.name.slice(0,20)+"…" : p.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* 12개월 카드 그리드 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px" }}>
            {visibleMonths.map(({ plan, idx }) => {
              const isCurrent = idx === currentMonth;
              const sig = getDiagSignal(idx);
              const monthProds = getMonthProducts(idx);

              return (
                <div
                  key={idx}
                  onClick={() => setDetail({ monthIdx: idx, plan, products: monthProds })}
                  style={{
                    ...CARD_STYLE,
                    ...(isCurrent ? { border:`1.5px solid ${PINK.main}`, boxShadow:`0 4px 20px rgba(212,83,126,0.12)` } : {}),
                    padding:"22px 20px",
                    cursor:"pointer",
                    transition:"box-shadow 0.15s",
                  }}
                >
                  {/* 월 헤더 */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                    <div>
                      <p style={{ fontSize:"28px", fontWeight:800, letterSpacing:"-0.03em", color:isCurrent?PINK.main:"#1a1a1a", margin:0, lineHeight:1 }}>{MONTH_EN[idx]}</p>
                      <p style={{ fontSize:"11px", color:"#9ca3af", margin:"2px 0 0" }}>{MONTH_KR[idx]} · {SEASON_KR[plan.season]}</p>
                    </div>
                    {isCurrent && (
                      <span style={{ fontSize:"10px", fontWeight:700, padding:"2px 8px", background:PINK.main, color:"#fff", borderRadius:"20px" }}>현재</span>
                    )}
                  </div>

                  {/* 이달 테마 */}
                  <p style={{ fontSize:"14px", fontWeight:700, color:"#111", margin:"0 0 5px", lineHeight:1.3 }}>{plan.theme}</p>
                  <p style={{ fontSize:"13px", color:"#6b7280", margin:"0 0 10px", lineHeight:1.4 }}>{plan.mainCategory}</p>

                  {/* 핵심 키워드 태그 */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"8px" }}>
                    {plan.focusKeywords.map(kw => (
                      <span key={kw} style={{ fontSize:"11px", fontWeight:600, padding:"2px 7px", borderRadius:"4px", background:"#f3f4f6", color:"#6b7280" }}>{kw}</span>
                    ))}
                  </div>

                  {/* 시즌 양념 */}
                  {plan.seasonSpice && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 8px", background:PINK.light, borderRadius:"8px", marginBottom:"8px" }}>
                      <span style={{ fontSize:"10px" }}>🌶</span>
                      <span style={{ fontSize:"11px", fontWeight:600, color:PINK.text }}>{plan.seasonSpice}</span>
                    </div>
                  )}

                  {/* 진단 신호 */}
                  {(sig.stars > 0 || sig.drops > 0 || monthProds.length > 0) && (
                    <div style={{ display:"flex", gap:"8px", marginTop:"8px", borderTop:"1px solid #f3f4f6", paddingTop:"8px" }}>
                      {monthProds.length > 0 && (
                        <span style={{ fontSize:"12px", color:"#374151" }}>상품 {monthProds.length}종</span>
                      )}
                      {sig.stars > 0 && (
                        <span style={{ fontSize:"12px", color:PINK.main }}>효자 {sig.stars}</span>
                      )}
                      {sig.drops > 0 && (
                        <span style={{ fontSize:"12px", color:"#9ca3af" }}>드롭 {sig.drops}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ── 2단: 그 달 기획서 ──────────────────────────────────────────────────────────
function MonthDetailView({ detail, onBack }: { detail: MonthDetail; onBack: () => void }) {
  const { monthIdx, plan, products } = detail;
  const currentMonth = new Date().getMonth();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const LIMIT = 3;
  const topN = (ps: Product[]) =>
    [...ps].sort((a, b) => ((b.matrix_x ?? 50) + (b.matrix_y ?? 50)) - ((a.matrix_x ?? 50) + (a.matrix_y ?? 50)));

  const major    = products.filter(p => getQuadrant(p.matrix_x??50, p.matrix_y??50) === "major");
  const quick    = products.filter(p => getQuadrant(p.matrix_x??50, p.matrix_y??50) === "quick");
  const thankless = products.filter(p => getQuadrant(p.matrix_x??50, p.matrix_y??50) === "thankless");

  const QUADRANT_LABEL: Record<string, { label: string; action: string; color: string }> = {
    major:     { label:"효자",     action:"키우기 — 광고·채널 확대",     color:PINK.main  },
    quick:     { label:"시즌 타이밍", action:"피크 45일 전 진입",          color:"#7c6fcd"  },
    thankless: { label:"마진 수술", action:"가격·묶음·배송비 최적화",     color:"#e97c4a"  },
  };

  const WEEK_FLOW = [
    { label:"1W", title:"들이기", desc:`${plan.focusKeywords[0]} 신규 재고 확인 및 발주` },
    { label:"2W", title:"키우기", desc:"효자 상품 광고 예산 집중 배분" },
    { label:"3W", title:"데이터", desc:"전월 대비 마진율 재계산 및 매트릭스 업데이트" },
    { label:"4W", title:"피크",   desc:plan.seasonSpice ? `${plan.seasonSpice} 타이밍 — 피크 전 노출 극대화` : "월말 재고 소진 및 다음 달 선기획" },
  ];

  return (
    <div style={{ fontFamily:"'Pretendard', -apple-system, sans-serif", color:"#111" }}>
    <div style={{ maxWidth: "1232px", margin: "0 auto" }}>
      {/* 상단 바 */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"28px", paddingBottom:"20px", borderBottom:"1px solid #e8eaed" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:"4px", background:"none", border:"none", cursor:"pointer", fontSize:"13px", color:"#6b7280", fontFamily:"inherit", padding:0 }}>
          ← Calendar
        </button>
        <span style={{ color:"#e8eaed" }}>|</span>
        <span style={{ fontSize:"13px", fontWeight:600, color:"#374151" }}>{SEASON_KR[plan.season]} · {MONTH_EN[monthIdx]} · {MONTH_KR[monthIdx]}</span>
        {monthIdx === currentMonth && (
          <span style={{ fontSize:"10px", fontWeight:700, padding:"2px 8px", background:PINK.main, color:"#fff", borderRadius:"20px" }}>이번 달</span>
        )}
      </div>

      {/* 히어로 */}
      <div style={{ ...CARD_STYLE, padding:"36px 40px", marginBottom:"28px", background:`linear-gradient(135deg, ${PINK.light} 0%, #f0f4fb 100%)`, border:`1px solid ${PINK.mid}` }}>
        <p style={{ fontSize:"11px", fontWeight:700, color:PINK.text, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>{MONTH_EN[monthIdx]} · {MONTH_KR[monthIdx]}</p>
        <h2 style={{ fontSize:"26px", fontWeight:800, color:"#0d0d0e", margin:"0 0 8px", letterSpacing:"-0.02em", lineHeight:1.2 }}>{plan.theme}</h2>
        <p style={{ fontSize:"14px", color:"#6b7280", margin:"0 0 16px", lineHeight:1.6 }}>{plan.mainCategory} 집중 · {SEASON_KR[plan.season]} 시즌</p>
        {plan.seasonSpice && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"4px 12px", background:"#fff", border:`1px solid ${PINK.mid}`, borderRadius:"20px" }}>
            <span style={{ fontSize:"11px" }}>🌶</span>
            <span style={{ fontSize:"11px", fontWeight:700, color:PINK.text }}>시즌 양념: {plan.seasonSpice}</span>
          </div>
        )}
      </div>

      {/* 4주 흐름 */}
      <div style={{ ...CARD_STYLE, padding:"24px 28px", marginBottom:"24px" }}>
        <p style={{ fontSize:"11px", fontWeight:700, color:"#9ca3af", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 16px" }}>4주 흐름</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"12px" }}>
          {WEEK_FLOW.map(w => (
            <div key={w.label} style={{ background:"#f9f9fb", borderRadius:"8px", padding:"14px 12px" }}>
              <p style={{ fontSize:"10px", fontWeight:700, color:"#9ca3af", margin:"0 0 4px" }}>{w.label}</p>
              <p style={{ fontSize:"13px", fontWeight:700, color:"#111", margin:"0 0 6px" }}>{w.title}</p>
              <p style={{ fontSize:"11px", color:"#6b7280", margin:0, lineHeight:1.5 }}>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 이달 집중 상품 (4사분면별) */}
      {products.length > 0 ? (
        <div style={{ ...CARD_STYLE, padding:"24px 28px", marginBottom:"24px" }}>
          <p style={{ fontSize:"11px", fontWeight:700, color:"#9ca3af", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 16px" }}>이달 집중 상품</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            {([["major", major], ["quick", quick], ["thankless", thankless]] as const).map(([q, ps]) => {
              if (ps.length === 0) return null;
              const qInfo = QUADRANT_LABEL[q];
              const sorted = topN(ps);
              const isExp = !!expanded[q];
              const visible = isExp ? sorted : sorted.slice(0, LIMIT);
              const remainder = sorted.length - LIMIT;
              return (
                <div key={q}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
                    <span style={{ fontSize:"11px", fontWeight:700, padding:"2px 8px", borderRadius:"4px", background: q==="major"?PINK.light:q==="quick"?"#ede9fd":"#fef0e8", color:qInfo.color }}>{qInfo.label}</span>
                    <span style={{ fontSize:"11px", color:"#6b7280" }}>{qInfo.action}</span>
                    <span style={{ fontSize:"10px", color:"#c4c8ce" }}>{sorted.length}종</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                    {visible.map(p => (
                      <div key={p.id} style={{ padding:"8px 14px", background:"#f9f9fb", borderRadius:"8px", border:"1px solid #e8eaed" }}>
                        <p style={{ fontSize:"12px", fontWeight:600, color:"#111", margin:"0 0 2px" }}>{p.name.length > 28 ? p.name.slice(0,28)+"…" : p.name}</p>
                        <p style={{ fontSize:"11px", color:"#9ca3af", margin:0 }}>
                          마진 {p.matrix_y ?? "?"}점 · 수요 {p.matrix_x ?? "?"}점
                          {p.price > 0 && ` · ${p.price.toLocaleString()}원`}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!isExp && remainder > 0 && (
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [q]: true }))}
                      style={{ marginTop:"8px", fontSize:"11px", color:qInfo.color, background:"none", border:`1px solid ${qInfo.color}40`, borderRadius:"6px", padding:"3px 10px", cursor:"pointer", fontFamily:"inherit" }}
                    >
                      +{remainder}개 더보기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ ...CARD_STYLE, padding:"40px 24px", textAlign:"center", marginBottom:"24px" }}>
          <p style={{ fontSize:"28px", margin:"0 0 12px" }}>📦</p>
          <p style={{ fontSize:"14px", color:"#9ca3af", margin:0 }}>Discover에서 상품을 발굴·등록하면 이달 기획서에 반영됩니다</p>
        </div>
      )}

      {/* 큐레이션 동작 신호 */}
      <div style={{ ...CARD_STYLE, padding:"24px 28px", marginBottom:"24px" }}>
        <p style={{ fontSize:"11px", fontWeight:700, color:"#9ca3af", letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 16px" }}>AI 큐레이션 신호</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"12px" }}>
          {[
            { icon:"⭐", label:"효자 키우기",     desc:`Major Projects ${major.length}종 — 광고 예산·채널 확대 우선` },
            { icon:"🔪", label:"저효율 실증",      desc:`Thankless ${thankless.length}종 — 묶음·가격 수술로 마진 복구` },
            { icon:"🌶", label:"시즌 타이밍",      desc:plan.seasonSpice ? `${plan.seasonSpice} 피크 45일 전 준비` : "해당 달 시즌 양념 없음 (상시 집중)" },
          ].map(item => (
            <div key={item.label} style={{ background:"#f9f9fb", borderRadius:"8px", padding:"16px 14px" }}>
              <p style={{ fontSize:"20px", margin:"0 0 8px" }}>{item.icon}</p>
              <p style={{ fontSize:"12px", fontWeight:700, color:"#111", margin:"0 0 4px" }}>{item.label}</p>
              <p style={{ fontSize:"13px", color:"#4b5563", margin:0, lineHeight:1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>{/* /maxWidth:1232px */}
    </div>
  );
}
