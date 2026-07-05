"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import MatrixBox, { getProductColor, MEZZANINE_CONFIG, SELLFIT_CONFIG } from "./MatrixBox";
import CustomerMatrix from "./CustomerMatrix";
import PolicyFilter from "./PolicyFilter";
import { DemoBadge } from "./DemoBadge";
import {
  FONT_BODY as TOKEN_FONT_BODY,
  COLOR_INK, COLOR_SUB, COLOR_RULE,
  TEXT_CAPTION_SIZE, TRACKING_OVERLINE,
} from "@/lib/tokens";

const STORE_KEY_MAP = {
  sellfit:   "sellfit_store_id",
  mezzanine: "mezzanine_store_id",
} as const;

interface OfferDraft {
  dream_result: string;
  possibility: string;
  time_lag: string;
  effort: string;
  hook: string;
  needs_evidence: boolean;
}

const inputCls = "w-full text-xs rounded border border-[#dededi] px-3 py-2 outline-none transition-all placeholder:text-slate-300 text-slate-700 focus:border-[#ef567c] focus:ring-1 focus:ring-[#ef567c]/20 resize-none bg-white";
const labelCls = "block text-[11px] font-semibold text-[#64676b] uppercase tracking-wider mb-1.5";

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
  contact_status?: string;
  source_type?: string;
}

export default function DiagnosisTab({
  onSeoNavigate,
  mode = "sellfit",
  highlightCategory,
  onSelectBrand,
  onNavigate,
  filter,
}: {
  onSeoNavigate?: (keyword: string) => void;
  mode?: "sellfit" | "mezzanine";
  highlightCategory?: string;
  onSelectBrand?: (brand: { id: string; name: string; category: string; matrix_x: number; matrix_y: number }) => void;
  onNavigate?: (tabId: string) => void;
  filter?: { category: string; dong: string; season: string };
}) {
  const storeKey = STORE_KEY_MAP[mode];
  const matrixConfig = mode === "mezzanine" ? MEZZANINE_CONFIG : SELLFIT_CONFIG;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Hover sync state (matrix ↔ left list)
  const [hoverProductId, setHoverProductId] = useState<string | null>(null);

  // 이상탐지
  const [anomalyIds,    setAnomalyIds]    = useState<string[]>([]);
  const [contamination, setContamination] = useState(0.05);

  // Matrix Option States (⚙️ Settings Dropdown)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [activeView, setActiveView] = useState<"all" | "quick_wins" | "major_projects" | "fill_ins" | "thankless_tasks">("all");
  const [scaleDots, setScaleDots] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showPartially, setShowPartially] = useState(true);
  const viewsRef = useRef<HTMLDivElement | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const categoryRef = useRef<HTMLDivElement | null>(null);

  // Drawer Panel States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comments, setComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  // 직관 노트 + 결정 (상품별 로컬 상태)
  const [intuitionNotes, setIntuitionNotes] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [offerDrafts, setOfferDrafts] = useState<Record<string, OfferDraft>>({});
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerErrors, setOfferErrors] = useState<Record<string, string>>({});

  // 판매량 연결 (X축 업데이트)
  const [salesPanelOpen, setSalesPanelOpen] = useState(false);
  const salesFileRef = useRef<HTMLInputElement>(null);
  const [salesRows, setSalesRows] = useState<Record<string, unknown>[]>([]);
  const [salesCols, setSalesCols] = useState<string[]>([]);
  const [colName, setColName] = useState("");
  const [colQty, setColQty] = useState("");
  const [colDate, setColDate] = useState("");
  const [salesPreview, setSalesPreview] = useState<{ id: string; name: string; qty: number; score: number }[]>([]);
  const [applyingSales, setApplyingSales] = useState(false);
  // 스냅샷
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotDone, setSnapshotDone] = useState(false);

  // Live matrix states (mezzanine mode only)
  const [isLive, setIsLive] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveCoords, setLiveCoords] = useState<Record<string, { x: number; y: number; reason: string }>>({});

  // mezzanine_brands 병합 (MANUAL + Gemini 분석 완료된 것만, filter 변경 시 재로드)
  const [mezzBrands, setMezzBrands] = useState<Product[]>([]);

  useEffect(() => {
    if (mode !== "mezzanine") return;
    const params = new URLSearchParams();
    params.set("source_type", "MANUAL");
    params.set("analyzed", "true");
    if (filter?.category && filter.category !== "all") params.set("category", filter.category);
    if (filter?.dong     && filter.dong     !== "all") params.set("dong",     filter.dong);
    if (filter?.season   && filter.season   !== "all") params.set("season",   filter.season);
    fetch(`/api/mezzanine/brands?${params.toString()}`)
      .then(r => r.json())
      .then((json: { brands?: Array<{ id: unknown; name: unknown; instagram_handle: unknown; category: unknown; matrix_x: unknown; matrix_y: unknown; contact_status: unknown }> }) => {
        setMezzBrands(
          (json.brands ?? []).map(b => ({
            id:             String(b.id ?? ""),
            name:           String(b.name ?? ""),
            keyword:        String(b.instagram_handle ?? ""),
            category:       String(b.category ?? "lifestyle"),
            price:          0,
            purchase_price: 0,
            is_own:         3,        // MANUAL 등록 브랜드 (stroke 처리)
            source_type:    "MANUAL",
            matrix_x:       Number(b.matrix_x) || 50,
            matrix_y:       Number(b.matrix_y) || 50,
            contact_status: String(b.contact_status ?? "untouched"),
          }))
        );
      })
      .catch(() => {});
  }, [mode, filter]);

  const settingsRef = useRef<HTMLDivElement | null>(null);

  const loadProducts = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/products?store_id=${sid}`);
      const json = await res.json();
      const raw: Product[] = json.products || [];
      // ⑤ purchase_price 기반 matrix_y 실시간 계산 (Y축=마진율%, 상품별 독립 — min/max 정규화 없음)
      const list = raw.map(p => {
        let updated = { ...p };
        // matrix_y fallback: purchase_price 기반 재계산
        if (updated.price > 0 && updated.purchase_price > 0 && !updated.matrix_y) {
          const marginY = Math.round(((updated.price - updated.purchase_price) / updated.price) * 100);
          updated = { ...updated, matrix_y: Math.max(1, Math.min(100, marginY)) };
        }
        // matrix_x fallback: null/undefined/0 → 50 중앙값
        if (!updated.matrix_x) {
          updated = { ...updated, matrix_x: 50 };
        }
        return updated;
      });
      setProducts(list);

      // Default selection to first product if available
      if (list.length > 0 && !selectedProductId) {
        setSelectedProductId(list[0].id);
      }
    } catch (e) {
      console.error("상품 로드 실패:", e);
    }
    setLoading(false);
  }, [selectedProductId]);

  useEffect(() => {
    const sid = localStorage.getItem(storeKey);
    if (sid) {
      setStoreId(sid);
      loadProducts(sid);
    } else {
      setLoading(false);
    }
  }, [loadProducts]);

  // 이상탐지: storeId·contamination·products 갱신 시 자동 재계산
  useEffect(() => {
    if (!storeId || products.length === 0) return;
    fetch(`/api/anomaly?store_id=${storeId}&contamination=${contamination}`)
      .then(r => r.json())
      .then(d => setAnomalyIds(d.anomalyIds || []))
      .catch(() => {});
  }, [storeId, contamination, products.length]);

  // Click outside listener for settings dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
      if (viewsRef.current && !viewsRef.current.contains(event.target as Node)) {
        setViewsOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdateProduct = async (id: string, fields: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
      }
    } catch (e) {
      console.error("상품 업데이트 실패:", e);
    }
  };

  const handleGenerateOffer = async () => {
    if (!selectedProduct || !selectedProductId || offerLoading) return;
    const pid = selectedProductId;
    setOfferLoading(true);
    setOfferErrors(prev => ({ ...prev, [pid]: "" }));
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct.name,
          category: selectedProduct.category,
          price: selectedProduct.price,
          purchasePrice: selectedProduct.purchase_price,
          matrixX: selectedProduct.matrix_x ?? 50,
          matrixY: selectedProduct.matrix_y ?? 50,
          decision: decisions[pid] || "",
          mode,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error_type?: string; error?: string } & Partial<OfferDraft>;
      if (res.ok && !data.error_type && data.hook) {
        setOfferDrafts(prev => ({ ...prev, [pid]: data as OfferDraft }));
      } else {
        const isRateLimit = res.status === 429 || data.error_type === "rate_limit";
        setOfferErrors(prev => ({
          ...prev,
          [pid]: isRateLimit
            ? "AI 분석이 잠시 바쁩니다. 30~60초 후 다시 시도해 주세요."
            : "초안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        }));
      }
    } catch {
      setOfferErrors(prev => ({ ...prev, [pid]: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }));
    } finally {
      setOfferLoading(false);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, newComment]);
    setNewComment("");
  };

  const handleContactStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/mezzanine/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, contact_status: status }),
      });
      setMezzBrands(prev => prev.map(b => b.id === id ? { ...b, contact_status: status } : b));
    } catch { /* 실패 무시 */ }
  };

  const fetchLiveMatrix = async () => {
    if (liveLoading || products.length === 0) return;
    setLiveLoading(true);
    try {
      const res = await fetch("/api/mezzanine/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brands: products.map(p => ({
            id: p.id,
            name: p.name,
            keyword: p.keyword,
            category: p.category,
            is_own: p.is_own,
          })),
        }),
      });
      if (!res.ok) throw new Error("API 실패");
      const data = await res.json();
      const coords: Record<string, { x: number; y: number; reason: string }> = {};
      for (const r of data.results) {
        coords[r.id] = { x: r.x, y: r.y, reason: r.reason };
      }
      setLiveCoords(coords);
      setIsLive(true);
    } catch {
      console.warn("라이브 매트릭스 실패 → 정적 데모로 대체");
      setLiveCoords({});
      setIsLive(false);
    } finally {
      setLiveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "80px 0", 
        color: "#8f9399", 
        fontSize: "13px", 
        fontFamily: "'Pretendard', sans-serif" 
      }}>
        불러오는 중...
      </div>
    );
  }

  if (!storeId) {
    const isMezzanine = mode === "mezzanine";
    const seedEndpoint = isMezzanine ? "/api/db/seed-mezzanine" : "/api/db/seed";
    const demoStoreId  = isMezzanine ? "mezzanine-demo-001" : "demo-store-001";
    const btnLabel     = isMezzanine ? "✨ 브랜드 데모 데이터 로드" : "✨ 데모 데이터로 즉시 확인";

    return (
      <div style={{
        textAlign: "center", padding: "80px 0",
        fontFamily: "'Pretendard', sans-serif",
      }}>
        <span style={{ fontSize: "36px", display: "block", marginBottom: "16px" }}>
          {isMezzanine ? "🏢" : "📊"}
        </span>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "#0d0d0e", marginBottom: "8px" }}>
          {isMezzanine ? "브랜드 데이터가 없습니다" : "스토어 데이터가 없습니다"}
        </p>
        <p style={{ fontSize: "13px", color: "#8f9399", marginBottom: "28px" }}>
          {isMezzanine
            ? "7개 입점 후보 브랜드를 매트릭스에 배치합니다."
            : "데모 데이터로 매트릭스를 바로 확인할 수 있습니다."}
        </p>
        <button
          onClick={async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerText = "⏳ 로딩 중...";
            try {
              await fetch("/api/db/init", { method: "POST" });
              await fetch("/api/db/migrate", { method: "POST" });
              await fetch(seedEndpoint, { method: "POST" });
              localStorage.setItem(storeKey, demoStoreId);
              if (!isMezzanine) {
                localStorage.setItem("product_registered", "true");
                localStorage.setItem("sellfit_store_info", JSON.stringify({
                  id: demoStoreId, name: "데모 스토어",
                  email: "demo@sellfit.kr", kakao: "01000000000",
                }));
              }
              window.location.reload();
            } catch {
              btn.disabled = false;
              btn.innerText = btnLabel;
            }
          }}
          style={{
            padding: "12px 28px", background: "#111111", color: "white",
            border: "none", borderRadius: "8px", fontSize: "14px",
            fontWeight: 700, cursor: "pointer", fontFamily: "'Pretendard', sans-serif",
          }}
        >
          {btnLabel}
        </button>
      </div>
    );
  }

  /* mezzanine 모드: seed products + 등록 mezzBrands 병합 */
  const allProducts = mode === "mezzanine" ? [...products, ...mezzBrands] : products;

  const selectedProduct = allProducts.find(p => p.id === selectedProductId);

  /* 라이브 좌표 오버라이드 (mezzanine 모드, liveCoords 있을 때만) */
  const displayProducts = (mode === "mezzanine" && Object.keys(liveCoords).length > 0)
    ? allProducts.map(p => {
        const lc = liveCoords[p.id];
        return lc ? { ...p, matrix_x: lc.x, matrix_y: lc.y } : p;
      })
    : allProducts;

  /* 사분면 필터 */
  const quadrantFiltered = activeView === "all" ? displayProducts : displayProducts.filter(p => {
    const mx = p.matrix_x ?? 50;
    const my = p.matrix_y ?? 50;
    if (activeView === "quick_wins")      return mx < 50 && my >= 50;
    if (activeView === "major_projects")  return mx >= 50 && my >= 50;
    if (activeView === "fill_ins")        return mx < 50 && my < 50;
    if (activeView === "thankless_tasks") return mx >= 50 && my < 50;
    return true;
  });
  /* 카테고리 필터 */
  const uniqueCategories = Array.from(new Set(allProducts.map(p => p.category))).sort();
  const filteredProducts = categoryFilter === "all"
    ? quadrantFiltered
    : quadrantFiltered.filter(p => p.category === categoryFilter);

  /* highlightCategory 있으면 좌측 리스트에서 해당 카테고리 제품 상단 정렬 */
  const sortedProducts = highlightCategory
    ? [...allProducts].sort((a, b) => {
        const aM = a.category === highlightCategory ? 0 : 1;
        const bM = b.category === highlightCategory ? 0 : 1;
        return aM - bM;
      })
    : allProducts;

  // 사분면 액션 문구 (규칙 기반)
  const getQuadrantAction = (p: Product) => {
    const mx = p.matrix_x ?? 50;
    const my = p.matrix_y ?? 50;
    if (mx >= 50 && my >= 50) return "확대 — 채널 추가 등록·광고비 증액 검토";
    if (mx < 50  && my >= 50) return "개선 — 썸네일·키워드 최적화로 판매량 부스팅";
    if (mx < 50  && my < 50)  return "드롭 — 관리 공수만 소모, 정리 검토";
    return "단가조정 — 매입가 네고 또는 판매가 인상 검토";
  };

  // 판매량 연결: 파일 파싱
  const handleSalesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const buf = evt.target?.result;
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      setSalesRows(rows);
      setSalesCols(rows.length > 0 ? Object.keys(rows[0]) : []);
      setSalesPreview([]);
    };
    reader.readAsArrayBuffer(file);
  };

  // 판매량 연결: 미리보기 계산
  const calcSalesPreview = () => {
    if (!colName || !colQty || salesRows.length === 0) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const qtySums: Record<string, number> = {};
    for (const row of salesRows) {
      if (colDate) {
        const d = new Date(String(row[colDate] ?? ""));
        if (!isNaN(d.getTime()) && d < cutoff) continue;
      }
      const rawName = String(row[colName] ?? "").trim();
      const qty = Number(row[colQty]) || 0;
      if (rawName && qty > 0) qtySums[rawName] = (qtySums[rawName] ?? 0) + qty;
    }
    const ownProducts = products.filter(p => p.is_own === 1);
    const matched = ownProducts.map(p => {
      const key = Object.keys(qtySums).find(k => k.includes(p.name) || p.name.includes(k)) ?? "";
      return { id: p.id, name: p.name, qty: key ? qtySums[key] : 0 };
    });
    const maxQty = Math.max(...matched.map(m => m.qty), 1);
    setSalesPreview(matched.map(m => ({ ...m, score: Math.round((m.qty / maxQty) * 100) })));
  };

  // 판매량 연결: matrix_x 적용
  const handleApplySales = async () => {
    setApplyingSales(true);
    for (const p of salesPreview) {
      await handleUpdateProduct(p.id, { matrix_x: p.score > 0 ? p.score : 10 });
    }
    setApplyingSales(false);
    setSalesPanelOpen(false);
    setSalesRows([]);
    setSalesCols([]);
    setSalesPreview([]);
    setColName(""); setColQty(""); setColDate("");
    if (storeId) loadProducts(storeId);
  };

  // 스냅샷 저장
  const handleSaveSnapshot = async () => {
    if (!storeId || savingSnapshot) return;
    setSavingSnapshot(true);
    const today = new Date().toISOString().slice(0, 10);
    await fetch("/api/matrix-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        date: today,
        items: products.filter(p => p.is_own === 1).map(p => ({
          product_id: p.id,
          product_name: p.name,
          matrix_x: p.matrix_x ?? 50,
          matrix_y: p.matrix_y ?? 50,
          quadrant: (() => {
            const mx = p.matrix_x ?? 50; const my = p.matrix_y ?? 50;
            if (mx >= 50 && my >= 50) return "expand";
            if (mx < 50  && my >= 50) return "improve";
            if (mx < 50  && my < 50)  return "drop";
            return "reprice";
          })(),
          predicted_action: getQuadrantAction(p),
        })),
      }),
    });
    setSavingSnapshot(false);
    setSnapshotDone(true);
    setTimeout(() => setSnapshotDone(false), 3000);
  };

  const getProductQuadrant = (p: Product) => {
    const mx = p.matrix_x !== null && p.matrix_x !== undefined ? p.matrix_x : 50;
    const my = p.matrix_y !== null && p.matrix_y !== undefined ? p.matrix_y : 50;
    const q = matrixConfig.quadrants;
    if (mx >= 50 && my >= 50) return { label: q.topRight,    bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" };
    if (mx < 50  && my >= 50) return { label: q.topLeft,     bg: "#fefce8", border: "#fde68a", text: "#92400e" };
    if (mx < 50  && my < 50)  return { label: q.bottomLeft,  bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" };
    return                           { label: q.bottomRight, bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" };
  };

  return (
    <div style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>

    <div style={{
      display: "flex",
      gap: "16px",
      width: "100%",
      height: "calc(100vh - 240px)",
      minHeight: "520px",
      alignItems: "stretch"
    }}>
      {/* ── Left Sidebar (Ideas / Products List) ── */}
      <div style={{
        width: "200px",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}>
        {/* Header row */}
        <div style={{ marginBottom: "10px" }}>
          <p style={{
            fontSize: "10px", fontWeight: 500,
            textTransform: "uppercase" as const, letterSpacing: "0.08em",
            color: "#9ca3af", fontFamily: TOKEN_FONT_BODY, margin: "0 0 8px 0",
          }}>
            DIAGNOSIS
          </p>
          <p style={{
            fontFamily: TOKEN_FONT_BODY,
            fontSize: "14px", fontWeight: 700,
            color: COLOR_INK, letterSpacing: "-0.01em",
            lineHeight: 1.4, margin: "0 0 6px 0",
          }}>
            {mode === "mezzanine" ? "적합성 × 집객력." : "내 라인업을 진단한다."}
          </p>
          <p style={{ fontSize: "13px", color: COLOR_SUB, lineHeight: 1.5, margin: 0, fontFamily: TOKEN_FONT_BODY }}>
            {mode === "mezzanine" ? "매트릭스로 입점 후보를 진단합니다." : "수요×마진으로 상품을 줄 세우고 키울지 내릴지 정한다."}
          </p>
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}>
          <span style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#0d0d0e"
          }}>
            {mode === "mezzanine" ? `Brands (${allProducts.length})` : `Ideas (${products.length})`}
          </span>
          <span style={{
            fontSize: "11px",
            color: "#8f9399",
            cursor: "pointer",
            fontWeight: 500
          }}>
            Highest priority <i className="ti ti-chevron-down" style={{ fontSize: "10px", marginLeft: "2px" }}></i>
          </span>
        </div>

        {/* Scrollable list */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingRight: "4px"
        }}>
          {sortedProducts.map((p, idx) => {
            const isSelected = p.id === selectedProductId;
            const isHovered = p.id === hoverProductId;
            const isHighlighted = !!(highlightCategory && p.category === highlightCategory);
            /* dim은 hover할 때만 — selectedProductId는 dim에 영향 없음 */
            const hasActive = !!hoverProductId;
            const isActive = isHovered;
            const dotColor = getProductColor(p.id);
            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedProductId(p.id);
                  setDrawerOpen(true);
                  const dp = displayProducts.find(d => d.id === p.id) ?? p;
                  onSelectBrand?.({
                    id: p.id, name: p.name, category: p.category,
                    matrix_x: dp.matrix_x ?? 50, matrix_y: dp.matrix_y ?? 50,
                  });
                }}
                onMouseEnter={() => setHoverProductId(p.id)}
                onMouseLeave={() => setHoverProductId(null)}
                style={{
                  background: isSelected ? "#f4f5f7" : isHighlighted ? "#f0f4ff" : "#ffffff",
                  border: `1px solid ${isHighlighted ? "#c7d2fe" : isSelected ? "#d1d5db" : "#e5e7eb"}`,
                  borderRadius: "6px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "background 0.1s ease, opacity 0.15s ease",
                  boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  opacity: hasActive ? (isActive ? 1 : 0.35) : 1,
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  {mode === "mezzanine" && (
                    <p style={{
                      fontSize: "9px", fontWeight: 500,
                      textTransform: "uppercase" as const, letterSpacing: TRACKING_OVERLINE,
                      color: "#b0b5bc", fontFamily: TOKEN_FONT_BODY, margin: 0, lineHeight: 1,
                    }}>
                      MATCH · {(idx + 1).toString().padStart(2, "0")}
                    </p>
                  )}
                  <span style={{ fontSize: "13px", fontWeight: isSelected ? 600 : 400, color: isActive ? dotColor : "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.15s ease" }}>
                    {p.name}
                  </span>
                </div>
                <i className="ti ti-dots-horizontal" style={{ fontSize: "12px", color: "#9ca3af", opacity: isActive ? 1 : 0 }} />
              </div>
            );
          })}
        </div>

        {/* ── LEGEND (mezzanine 전용) ── */}
        {mode === "mezzanine" && (
          <div style={{
            marginTop: "12px", paddingTop: "10px",
            borderTop: `1px solid ${COLOR_RULE}`, flexShrink: 0,
          }}>
            <p style={{
              fontSize: TEXT_CAPTION_SIZE, fontWeight: 500,
              textTransform: "uppercase" as const, letterSpacing: TRACKING_OVERLINE,
              color: "#9ca3af", fontFamily: TOKEN_FONT_BODY, margin: "0 0 8px 0",
            }}>
              LEGEND
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {[
                { label: "핵심 앵커",  sub: "적합↑ · 집객↑", color: "#22c55e" },
                { label: "집객 지원",  sub: "적합↓ · 집객↑", color: "#f59e0b" },
                { label: "틈새 타깃", sub: "적합↑ · 집객↓", color: "#60a5fa" },
                { label: "보류",       sub: "적합↓ · 집객↓", color: "#d1d5db" },
              ].map(q => (
                <div key={q.label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{
                    width: "8px", height: "8px", borderRadius: "2px",
                    background: q.color, flexShrink: 0, display: "inline-block",
                  }} />
                  <span style={{ fontSize: "11px", color: COLOR_INK, fontFamily: TOKEN_FONT_BODY, fontWeight: 500 }}>
                    {q.label}
                  </span>
                  <span style={{ fontSize: "10px", color: COLOR_SUB, fontFamily: TOKEN_FONT_BODY }}>
                    {q.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column (Hero + Matrix Card) ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
      <div style={{ maxWidth: "1232px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Hero */}
        <div style={{ paddingBottom: "20px", borderBottom: "1px solid #e8eaed" }}>
          <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 8px" }}>DIAGNOSE</p>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", color: "#0d0d0e", margin: "0 0 6px" }}>
            {mode === "mezzanine" ? "Fit × Draw." : "Diagnose Your Lineup."}
          </h1>
          <p style={{ fontSize: "14px", color: "#4b5563", margin: 0, lineHeight: 1.6 }}>
            {mode === "mezzanine" ? "적합성 × 집객력으로 입점 후보를 진단합니다." : "수요×마진으로 상품을 줄 세우고 키울지 내릴지 정한다."}
          </p>
        </div>

        {/* Matrix Card */}
        <div style={{
          height: "calc(100vh - 350px)",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          border: "1px solid #dededi",
          borderRadius: "5px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          position: "relative",
          overflow: "hidden"
        }}>

        {/* Graph Header Row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: "1px solid #dededi",
          background: "#ffffff",
          zIndex: 10
        }}>
          {/* Left Controls & ⚙️ Settings Dropdown Trigger */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            position: "relative"
          }} ref={settingsRef}>
            {/* Gear Settings Button */}
            <div
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "5px",
                border: "1px solid #dededi",
                background: settingsOpen ? "#eeeef1" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <i className="ti ti-settings" style={{ fontSize: "14px", color: "#64676b" }}></i>
            </div>

            {/* ⚙️ Settings Dropdown Menu (Screenshot 5 visual identical) */}
            {settingsOpen && (
              <div style={{
                position: "absolute",
                top: "30px",
                left: "0",
                background: "#ffffff",
                border: "1px solid #dededi",
                borderRadius: "5px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "6px 0",
                width: "200px",
                zIndex: 40
              }}>
                {[
                  { id: "scale",  label: "Scale dots",                 state: scaleDots,     setter: setScaleDots },
                  { id: "labels", label: "Idea labels",                state: showLabels,    setter: setShowLabels },
                  { id: "grid",   label: "Grid lines",                 state: showGrid,      setter: setShowGrid },
                  { id: "part",   label: "Show partially prioriti...", state: showPartially, setter: setShowPartially },
                ].map((opt) => (
                  <div 
                    key={opt.id}
                    onClick={() => opt.setter(!opt.state)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 16px",
                      fontSize: "11px",
                      color: "#64676b",
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "background 0.15s ease"
                    }}
                    className="hover:bg-[#f3f4f6]"
                  >
                    <span>{opt.label}</span>
                    {opt.state && <i className="ti ti-check" style={{ fontSize: "10px", color: "#ef567c" }}></i>}
                  </div>
                ))}
                {/* 이상탐지 민감도 슬라이더 */}
                <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f1f3" }}>
                  <div style={{ fontSize: "11px", color: "#64676b", fontWeight: 500, marginBottom: "5px" }}>
                    이상탐지 민감도 — {Math.round(contamination * 100)}%
                  </div>
                  <input
                    type="range" min={1} max={20} step={1}
                    value={Math.round(contamination * 100)}
                    onChange={e => setContamination(parseInt(e.target.value) / 100)}
                    style={{ width: "100%", accentColor: "#ef567c", cursor: "pointer" }}
                    onClick={e => e.stopPropagation()}
                  />
                  <div style={{ fontSize: "10px", color: "#a0a4ab", marginTop: "2px" }}>
                    현재 상위 {Math.round(contamination * 100)}% 이상치 표시 중
                  </div>
                </div>
              </div>
            )}
            
            {/* All views dropdown — 실제 사분면 필터 */}
            <div style={{ position: "relative" }} ref={viewsRef}>
              <div
                onClick={() => setViewsOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", border: "1px solid #e8eaed",
                  borderRadius: "5px", cursor: "pointer",
                  fontSize: "13px", color: "#4a4f57", fontWeight: 500,
                  background: activeView !== "all" ? "#fff5f7" : "#ffffff"
                }}>
                <i className="ti ti-layout-grid" style={{ fontSize: "11px", color: activeView !== "all" ? "#ef567c" : "#8f9399" }} />
                <span style={{ color: activeView !== "all" ? "#ef567c" : undefined }}>
                  {activeView === "all" ? "All views" :
                    activeView === "quick_wins" ? "Quick Wins" :
                    activeView === "major_projects" ? "Major Projects" :
                    activeView === "fill_ins" ? "Fill Ins" : "Thankless Tasks"}
                </span>
                {activeView !== "all" && (
                  <span
                    onClick={e => { e.stopPropagation(); setActiveView("all"); }}
                    style={{ fontSize: "11px", color: "#ef567c", marginLeft: "2px" }}>✕</span>
                )}
                <i className="ti ti-chevron-down" style={{ fontSize: "10px", marginLeft: "2px" }} />
              </div>

              {viewsOpen && (
                <div style={{
                  position: "absolute", top: "32px", left: 0,
                  background: "white", border: "1px solid #e8eaed",
                  borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  padding: "4px 0", width: "180px", zIndex: 50
                }}>
                  {[
                    { key: "all" as const, label: "All views" },
                    { key: "quick_wins" as const, label: "Quick Wins" },
                    { key: "major_projects" as const, label: "Major Projects" },
                    { key: "fill_ins" as const, label: "Fill Ins" },
                    { key: "thankless_tasks" as const, label: "Thankless Tasks" },
                  ].map(v => (
                    <div key={v.key}
                      onClick={() => { setActiveView(v.key); setViewsOpen(false); }}
                      style={{
                        padding: "7px 14px", fontSize: "12px", cursor: "pointer",
                        color: activeView === v.key ? "#ef567c" : "#4a4f57",
                        fontWeight: activeView === v.key ? 600 : 400,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                      className="hover:bg-[#f9fafb]">
                      <span>{v.label}</span>
                      {activeView === v.key && <i className="ti ti-check" style={{ fontSize: "10px", color: "#ef567c" }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 카테고리 필터 */}
            {mode === "sellfit" && (
              <div style={{ position: "relative" }} ref={categoryRef}>
                <div
                  onClick={() => setCategoryOpen(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", border: "1px solid #e8eaed",
                    borderRadius: "5px", cursor: "pointer",
                    fontSize: "13px", color: "#4a4f57", fontWeight: 500,
                    background: categoryFilter !== "all" ? "#fff5f7" : "#ffffff",
                  }}>
                  <i className="ti ti-tag" style={{ fontSize: "11px", color: categoryFilter !== "all" ? "#ef567c" : "#8f9399" }} />
                  <span style={{ color: categoryFilter !== "all" ? "#ef567c" : undefined }}>
                    {categoryFilter === "all" ? "All categories" : categoryFilter}
                  </span>
                  {categoryFilter !== "all" && (
                    <span onClick={e => { e.stopPropagation(); setCategoryFilter("all"); }} style={{ fontSize: "11px", color: "#ef567c", marginLeft: "2px" }}>✕</span>
                  )}
                  <i className="ti ti-chevron-down" style={{ fontSize: "10px", marginLeft: "2px" }} />
                </div>
                {categoryOpen && (
                  <div style={{
                    position: "absolute", top: "32px", left: 0,
                    background: "white", border: "1px solid #e8eaed",
                    borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    padding: "4px 0", minWidth: "160px", zIndex: 50,
                  }}>
                    <div onClick={() => { setCategoryFilter("all"); setCategoryOpen(false); }}
                      style={{ padding: "7px 14px", fontSize: "12px", cursor: "pointer", color: categoryFilter === "all" ? "#ef567c" : "#4a4f57", fontWeight: categoryFilter === "all" ? 600 : 400, display: "flex", justifyContent: "space-between" }}
                      className="hover:bg-[#f9fafb]">
                      <span>All categories</span>
                      {categoryFilter === "all" && <i className="ti ti-check" style={{ fontSize: "10px", color: "#ef567c" }} />}
                    </div>
                    {uniqueCategories.map(cat => (
                      <div key={cat} onClick={() => { setCategoryFilter(cat); setCategoryOpen(false); }}
                        style={{ padding: "7px 14px", fontSize: "12px", cursor: "pointer", color: categoryFilter === cat ? "#ef567c" : "#4a4f57", fontWeight: categoryFilter === cat ? 600 : 400, display: "flex", justifyContent: "space-between" }}
                        className="hover:bg-[#f9fafb]">
                        <span>{cat}</span>
                        {categoryFilter === cat && <i className="ti ti-check" style={{ fontSize: "10px", color: "#ef567c" }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span style={{ fontSize: "12px", color: "#8f9399" }}>
              Showing {filteredProducts.length} prioritized Ideas
            </span>
          </div>

          {/* Right Controls */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {drawerOpen && (
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #dededi",
                  borderRadius: "5px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  color: "#ef567c",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <i className="ti ti-arrow-left" style={{ fontSize: "11px" }}></i> Back to Matrix
              </button>
            )}

            {/* 라이브 매트릭스 버튼 (mezzanine 전용) */}
            {mode === "mezzanine" && (
              isLive ? (
                <>
                  <span style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    fontSize: "11px", color: "#3b4fd8", fontWeight: 600,
                    padding: "5px 10px", borderRadius: "5px",
                    border: "1px solid #c7d2fe", background: "#eff6ff",
                  }}>
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "#3b4fd8", display: "inline-block",
                      animation: "pulse 2s infinite",
                    }} />
                    라이브 실행 중
                  </span>
                  <button
                    onClick={fetchLiveMatrix}
                    disabled={liveLoading}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #3b4fd8",
                      borderRadius: "5px",
                      padding: "5px 10px",
                      fontSize: "11px",
                      color: liveLoading ? "#9ca3af" : "#3b4fd8",
                      fontWeight: 600,
                      cursor: liveLoading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    {liveLoading ? "분석 중..." : "↺ 조건 바꿔서 다시 돌리기"}
                  </button>
                </>
              ) : (
                <button
                  onClick={fetchLiveMatrix}
                  disabled={liveLoading}
                  style={{
                    background: liveLoading ? "#f0f1f3" : "#3b4fd8",
                    border: "none",
                    borderRadius: "5px",
                    padding: "5px 12px",
                    fontSize: "11px",
                    color: liveLoading ? "#9ca3af" : "#ffffff",
                    fontWeight: 600,
                    cursor: liveLoading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}
                >
                  {liveLoading ? "⏳ 분석 중..." : "▶ 라이브 매트릭스 실행"}
                </button>
              )
            )}

            {/* 판매량 업데이트 버튼 (sellfit 전용) */}
            {mode === "sellfit" && storeId && (
              <button
                onClick={() => setSalesPanelOpen(v => !v)}
                style={{
                  background: salesPanelOpen ? "#f0fdf4" : "#ffffff",
                  border: `1px solid ${salesPanelOpen ? "#86efac" : "#dededi"}`,
                  borderRadius: "5px", padding: "5px 10px",
                  fontSize: "11px", color: salesPanelOpen ? "#166534" : "#64676b",
                  fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                <i className="ti ti-chart-bar" style={{ fontSize: "11px" }} />
                판매량 연결
              </button>
            )}

            {/* 스냅샷 저장 버튼 (sellfit 전용) */}
            {mode === "sellfit" && storeId && (
              <button
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot}
                style={{
                  background: snapshotDone ? "#f0fdf4" : "#ffffff",
                  border: `1px solid ${snapshotDone ? "#86efac" : "#dededi"}`,
                  borderRadius: "5px", padding: "5px 10px",
                  fontSize: "11px", color: snapshotDone ? "#166534" : "#64676b",
                  fontWeight: 500, cursor: savingSnapshot ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                <i className="ti ti-camera" style={{ fontSize: "11px" }} />
                {savingSnapshot ? "저장 중…" : snapshotDone ? "저장됨 ✓" : "스냅샷 저장"}
              </button>
            )}

            {mode === "sellfit" && storeId && (
              <button
                onClick={async (e) => {
                  if (!window.confirm("정말 초기화하시겠습니까?")) return;
                  const btn = e.currentTarget;
                  btn.disabled = true;
                  btn.textContent = "⏳...";
                  try {
                    await fetch("/api/db/seed", { method: "POST" });
                    window.location.reload();
                  } catch {
                    btn.disabled = false;
                    btn.textContent = "데모 리셋";
                  }
                }}
                style={{
                  background: "#ffffff", border: "1px solid #dededi",
                  borderRadius: "5px", padding: "5px 10px",
                  fontSize: "11px", color: "#64676b", fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                데모 리셋
              </button>
            )}
            <button style={{
              background: "#ffffff",
              border: "1px solid #dededi",
              borderRadius: "5px",
              padding: "5px 10px",
              fontSize: "11px",
              color: "#64676b",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              <i className="ti ti-filter" style={{ fontSize: "11px" }}></i> Filter
            </button>
            <button style={{
              background: "#ffffff",
              border: "1px solid #dededi",
              borderRadius: "5px",
              padding: "5px 10px",
              fontSize: "11px",
              color: "#64676b",
              fontWeight: 500,
              cursor: "pointer"
            }}>
              Shortlist
            </button>
          </div>
        </div>

        {/* 판매량 연결 패널 */}
        {salesPanelOpen && mode === "sellfit" && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f2a1e", marginBottom: 10 }}>
              정산파일로 수요축(X) 업데이트
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>파일 선택 (xlsx/xls/csv)</div>
                <input
                  ref={salesFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleSalesFile}
                  style={{ fontSize: 12 }}
                />
              </div>
              {salesCols.length > 0 && (
                <>
                  <div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>상품명 컬럼 *</div>
                    <select value={colName} onChange={e => setColName(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 5, border: "1px solid #e0ede9" }}>
                      <option value="">선택</option>
                      {salesCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>수량 컬럼 *</div>
                    <select value={colQty} onChange={e => setColQty(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 5, border: "1px solid #e0ede9" }}>
                      <option value="">선택</option>
                      {salesCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>날짜 컬럼 (최근 30일 필터, 선택)</div>
                    <select value={colDate} onChange={e => setColDate(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 5, border: "1px solid #e0ede9" }}>
                      <option value="">전체 기간</option>
                      {salesCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={calcSalesPreview}
                    disabled={!colName || !colQty}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#0f2a1e", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    미리보기
                  </button>
                </>
              )}
            </div>
            {salesPreview.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>매핑 결과 — 자사 상품만 적용됩니다</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {salesPreview.map(p => (
                    <span key={p.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, background: p.qty > 0 ? "#f0fdf4" : "#f9fafb", border: `1px solid ${p.qty > 0 ? "#86efac" : "#e5e7eb"}`, color: p.qty > 0 ? "#166534" : "#9ca3af" }}>
                      {p.name} → {p.qty}건 → X:{p.score}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleApplySales}
                  disabled={applyingSales}
                  style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#ef567c", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {applyingSales ? "적용 중…" : "matrix_x 업데이트 →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Work Area (Matrix Grid or Slide-in Drawer) */}
        <div style={{
          flex: 1,
          position: "relative",
          background: "#ffffff"
        }}>
          {/* A. Matrix — Frill: 패널 열려도 dimmed로 남음 (사라지지 않음) */}
          <div style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: drawerOpen ? 0.22 : 1,
            transition: "opacity 0.25s ease",
            pointerEvents: drawerOpen ? "none" : "auto"
          }}>
            <MatrixBox
              products={filteredProducts}
              setProducts={setProducts}
              setSelectedProductId={(id) => {
                setSelectedProductId(id);
                if (id) setDrawerOpen(true);
              }}
              handleUpdateProduct={handleUpdateProduct}
              showLabels={showLabels}
              showGrid={showGrid}
              hoverProductId={hoverProductId}
              setHoverProductId={setHoverProductId}
              config={matrixConfig}
              anomalyIds={anomalyIds}
            />
          </div>

          {/* B. Drawer — Frill: 오른쪽 65% 오버레이, 왼쪽 35%는 dimmed 매트릭스 노출 */}
          {selectedProduct && (
            <div style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "65%",
              height: "100%",
              background: "#ffffff",
              display: "flex",
              transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 30,
              boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.04)"
            }}>
              {/* Left Column: Admin Sidebar inside Drawer */}
              <div style={{
                width: "220px",
                background: "#fbfbfb",
                borderRight: "1px solid #dededi",
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "24px"
              }}>
                {/* Meta list parameters */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Contact status row (MANUAL 등록 브랜드 전용) */}
                  {mode === "mezzanine" && selectedProduct.source_type === "MANUAL" && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64676b", fontWeight: 600, marginBottom: "6px" }}>
                        <i className="ti ti-phone" style={{ fontSize: "12px" }}></i>
                        <span>컨택 상태</span>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {[
                          { value: "untouched", label: "미접촉", bg: "#f9fafb", border: "#e5e7eb", color: "#6b7280" },
                          { value: "contacted", label: "컨택",   bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
                          { value: "replied",   label: "회신",   bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
                        ].map(s => {
                          const isActive = (selectedProduct.contact_status ?? "untouched") === s.value;
                          return (
                            <button key={s.value}
                              onClick={() => handleContactStatus(selectedProductId!, s.value)}
                              style={{
                                fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px",
                                background: isActive ? s.bg : "#ffffff",
                                border: `1px solid ${isActive ? s.border : "#e8eaed"}`,
                                color: isActive ? s.color : "#9ca3af",
                                cursor: "pointer", fontFamily: "inherit",
                              }}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Decision row */}
                  {decisions[selectedProductId ?? ""] && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64676b", fontWeight: 600 }}>
                        <i className="ti ti-bolt" style={{ fontSize: "12px" }}></i>
                        <span>Decision</span>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "#fff5f7", border: "1px solid #ffd6e0", color: "#c4345a" }}>
                        {decisions[selectedProductId ?? ""]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 3-section panel */}
              <div style={{
                flex: 1, background: "#ffffff",
                padding: "28px 36px",
                display: "flex", flexDirection: "column",
                overflowY: "auto", position: "relative"
              }}>
                {/* Close button */}
                <div onClick={() => setDrawerOpen(false)} style={{
                  position: "absolute", top: "22px", right: "28px",
                  width: "24px", height: "24px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", background: "#f3f4f6", color: "#64676b"
                }} className="hover:bg-slate-200">
                  <i className="ti ti-x" style={{ fontSize: "11px" }} />
                </div>

                {/* Title block */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "22px" }}>
                  <div style={{ border: "1px solid #e8eaed", borderRadius: "6px", padding: "6px 10px", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <i className="ti ti-chevron-up" style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "2px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a" }}>
                      {selectedProduct.matrix_y ?? 50}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 5px 0", lineHeight: 1.35, paddingRight: "28px" }}>
                      {selectedProduct.name}
                    </h3>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                      AI Advisor · <span style={{ color: "#ef567c", fontWeight: 600 }}>#{selectedProduct.category}</span>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                  {/* ■ Section 1: AI 진단 (데이터) */}
                  <div style={{ border: "1px solid #e8eaed", borderRadius: "8px", padding: "16px 18px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "10px" }}>
                      {mode === "mezzanine" ? "📍 배치 근거" : "📊 AI 진단"}
                    </p>
                    {/* Data chips */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: getProductQuadrant(selectedProduct).bg, border: `1px solid ${getProductQuadrant(selectedProduct).border}`, color: getProductQuadrant(selectedProduct).text }}>
                        {getProductQuadrant(selectedProduct).label}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "#f9fafb", border: "1px solid #e8eaed", color: "#4a4f57" }}>
                        {mode === "mezzanine" ? "공간 적합도" : "판매량(최근 30일)"} {selectedProduct.matrix_x ?? 50}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "#f9fafb", border: "1px solid #e8eaed", color: "#4a4f57" }}>
                        {mode === "mezzanine" ? "집객력" : "마진율"} {selectedProduct.matrix_y ?? 50}
                      </span>
                    </div>
                    {/* Diagnosis text */}
                    <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.65, marginBottom: "12px" }}>
                      {mode === "mezzanine"
                        ? (() => {
                            const liveReason = liveCoords[selectedProduct.id]?.reason;
                            if (liveReason) {
                              return `${getProductQuadrant(selectedProduct).label} 영역. ${liveReason}`;
                            }
                            return selectedProduct.is_own === 1
                              ? `${getProductQuadrant(selectedProduct).label} 영역. 공간의 실증 이력 — 이 브랜드가 이 공간과 이미 호흡한 결과다. 발굴 로직 + 현장 판단으로 배치한 예시.`
                              : `${getProductQuadrant(selectedProduct).label} 영역. 엔진이 다녀간 행사 이력을 읽고 뽑은 후보. 미접촉 상태 — 파일럿 기간에 컨택·검증 예정.`;
                          })()
                        : (selectedProduct.is_own === 1
                          ? `${getProductQuadrant(selectedProduct).label} — ${getQuadrantAction(selectedProduct)}`
                          : `${getProductQuadrant(selectedProduct).label} 영역 (경쟁사). 경쟁 키워드 입찰 한계선(CPC 350원 상한)을 고려하여 광고 효율을 모니터링하세요.`)}
                    </p>
                    {/* Attribute chips */}
                    {mode !== "mezzanine" && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                        {[
                          `키워드: ${selectedProduct.keyword}`,
                          `가격: ${selectedProduct.price.toLocaleString()}원`,
                          `매입가: ${selectedProduct.purchase_price.toLocaleString()}원`,
                        ].map(t => (
                          <span key={t} style={{ fontSize: "10px", padding: "2px 8px", background: "#f9fafb", border: "1px solid #e8eaed", borderRadius: "5px", color: "#6b7280" }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {/* SEO CTA (sellfit only) */}
                    {mode !== "mezzanine" && (
                      <button onClick={() => onSeoNavigate?.(selectedProduct.keyword)}
                        style={{ padding: "7px 14px", borderRadius: "6px", border: "none", background: "#ef567c", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Pretendard', sans-serif" }}>
                        🧭 SEO 최적화 →
                      </button>
                    )}
                    {/* 경제 지표 (mezzanine only) */}
                    {mode === "mezzanine" && (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                        {["예상 집객", "월 매출 기여", "NOI 기여"].map(label => (
                          <span key={label} style={{
                            fontSize: "10px", padding: "3px 10px",
                            background: "#f9fafb", border: "1px solid #e8eaed",
                            borderRadius: "5px", color: "#9ca3af",
                          }}>
                            {label}: <strong style={{ color: "#c4c8ce" }}>[파일럿 후 실측]</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ■ Section 2: 직관 노트 (사람 입력) */}
                  <div style={{ border: "1px solid #e8eaed", borderRadius: "8px", padding: "16px 18px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "4px" }}>✏️ 현장 노트</p>
                    <p style={{ fontSize: "11px", color: "#b0b5bc", marginBottom: "10px" }}>
                      {mode === "mezzanine"
                        ? "데이터로 안 잡히는 현장 감. 건축주·담당자 직접 메모."
                        : "데이터로 안 잡히는 현장 감. 이다슬·빈 대표의 직접 메모."}
                    </p>
                    <textarea
                      placeholder={mode === "mezzanine"
                        ? '"건축주 코멘트 / 선호도 / 계약 조건"'
                        : '"스테디다 / 호응도 좋다 / 재고 빠진다"'}
                      value={intuitionNotes[selectedProductId ?? ""] ?? ""}
                      onChange={e => setIntuitionNotes(prev => ({ ...prev, [selectedProductId!]: e.target.value }))}
                      rows={3}
                      className={inputCls}
                      style={{ background: "#ffffff", padding: "10px 12px", fontSize: "12px", lineHeight: 1.6 }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#b0b5bc" }}>자동 저장됨</span>
                      <button
                        onClick={handleAddComment}
                        style={{ padding: "5px 12px", borderRadius: "5px", border: "1px solid #e8eaed", background: "white", color: "#4a4f57", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Pretendard', sans-serif" }}>
                        메모 추가
                      </button>
                    </div>
                    {/* Comments */}
                    {comments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                        {comments.map((cmt, idx) => (
                          <div key={idx} style={{ background: "#f9fafb", borderRadius: "5px", padding: "8px 10px", fontSize: "11px", color: "#4a4f57" }}>{cmt}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ■ Section 3: 결정 */}
                  <div style={{ border: "1px solid #e8eaed", borderRadius: "8px", padding: "16px 18px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "12px" }}>⚡ 결정</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(mode === "mezzanine"
                        ? ["입점 확정", "협상", "조건부", "보류"]
                        : ["개발", "소싱", "위탁", "관리유지", "철수"]
                      ).map(d => {
                        const isChosen = decisions[selectedProductId ?? ""] === d;
                        return (
                          <button key={d}
                            onClick={() => setDecisions(prev => ({ ...prev, [selectedProductId!]: isChosen ? "" : d }))}
                            style={{
                              padding: "7px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: isChosen ? 600 : 400,
                              background: isChosen ? "#ef567c" : "white",
                              color: isChosen ? "white" : "#4a4f57",
                              border: isChosen ? "1px solid #ef567c" : "1px solid #e8eaed",
                              cursor: "pointer", fontFamily: "'Pretendard', sans-serif",
                              transition: "all 0.12s ease"
                            }}>
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    {decisions[selectedProductId ?? ""] && (
                      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px" }}>
                        현재 결정: <strong style={{ color: "#1a1a1a" }}>{decisions[selectedProductId ?? ""]}</strong>
                      </p>
                    )}
                    {mode === "mezzanine" && decisions[selectedProductId ?? ""] && onNavigate && (
                      <button
                        onClick={() => {
                          const dp = displayProducts.find(d => d.id === selectedProductId);
                          if (dp) onSelectBrand?.({ id: dp.id, name: dp.name, category: dp.category, matrix_x: dp.matrix_x ?? 50, matrix_y: dp.matrix_y ?? 50 });
                          onNavigate("optimize");
                        }}
                        style={{
                          marginTop: "10px", width: "100%",
                          padding: "9px 14px", borderRadius: "6px",
                          background: "#111111", color: "#fff",
                          border: "none", fontSize: "12px", fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        }}
                      >
                        <i className="ti ti-chart-bar" style={{ fontSize: "12px" }} />
                        Optimize에서 P&amp;L 확인 →
                      </button>
                    )}
                  </div>

                  {/* ■ Section 4: 오퍼 설계 */}
                  {(() => {
                    const pid = selectedProductId ?? "";
                    const offer = offerDrafts[pid];
                    const offerText = offer
                      ? [offer.dream_result, offer.possibility, offer.time_lag, offer.effort, offer.hook].join(" ")
                      : "";
                    const FIELDS: { key: keyof OfferDraft; label: string; rows: number }[] = [
                      { key: "hook",         label: "후킹 1줄",   rows: 1 },
                      { key: "dream_result", label: "꿈의 결과",  rows: 2 },
                      { key: "possibility",  label: "가능성",     rows: 2 },
                      { key: "time_lag",     label: "시간 지연",  rows: 1 },
                      { key: "effort",       label: "노력·희생", rows: 2 },
                    ];
                    return (
                      <div style={{ border: "1px solid #e8eaed", borderRadius: "8px", padding: "16px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
                            {mode === "mezzanine" ? "📩 입점 제안 초안" : "📣 오퍼 설계"}
                          </p>
                          <button
                            onClick={handleGenerateOffer}
                            disabled={offerLoading}
                            style={{
                              padding: "5px 12px", borderRadius: "5px", border: "none",
                              background: offerLoading ? "#f0f1f3" : (mode === "mezzanine" ? "#3b4fd8" : "#ef567c"),
                              color: offerLoading ? "#9ca3af" : "white",
                              fontSize: "11px", fontWeight: 600, cursor: offerLoading ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {offerLoading ? "생성 중..." : (mode === "mezzanine" ? "제안 초안 생성" : "AI 초안 생성")}
                          </button>
                        </div>
                        <p style={{ fontSize: "11px", color: "#b0b5bc", marginBottom: "12px" }}>
                          {mode === "mezzanine"
                            ? "AI 초안 → 담당자가 현장 감각으로 다듬기. 승인 시 Aiges Pontos 기획 파트너 명의로 발송."
                            : "AI 초안 → 빈 대표·이다슬이 현장 감각으로 다듬기"}
                        </p>

                        {offerErrors[pid] && (
                          <div style={{ padding: "10px 14px", borderRadius: "7px", background: "#fef9c3", border: "1px solid #fde68a", fontSize: "12px", color: "#92400e", marginBottom: "12px" }}>
                            {offerErrors[pid]}
                          </div>
                        )}

                        {offer ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {FIELDS.map(f => (
                              <div key={f.key}>
                                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: "4px" }}>
                                  {f.label}
                                  {f.key === "possibility" && offer.needs_evidence && (
                                    <span style={{ marginLeft: "6px", fontSize: "10px", color: "#f59e0b", fontWeight: 600, textTransform: "none" }}>⚠️ 실증자료 필요</span>
                                  )}
                                </label>
                                <textarea
                                  rows={f.rows}
                                  value={String(offer[f.key] ?? "")}
                                  onChange={e => setOfferDrafts(prev => ({
                                    ...prev,
                                    [pid]: { ...prev[pid], [f.key]: e.target.value }
                                  }))}
                                  className={inputCls}
                                  style={{ background: "#fff", padding: "8px 10px", fontSize: "12px", lineHeight: 1.55, resize: "vertical" }}
                                />
                              </div>
                            ))}
                            <p style={{ fontSize: "10px", color: "#c4c8ce", marginTop: "2px" }}>
                              ⚡ AI 생성 초안 · AI기본법 제33조 — 실사용 전 사람 검토 필수
                            </p>
                            {offerText && <PolicyFilter text={offerText} />}
                          </div>
                        ) : (
                          <p style={{ fontSize: "12px", color: "#c4c8ce" }}>
                            "AI 초안 생성" 버튼으로 오퍼 초안을 만드세요.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* ■ Section 5: 전환 마케팅 */}
                  {(() => {
                    if (mode === "mezzanine") {
                      return (
                        <div style={{ border: "1px solid #fde68a", borderRadius: "8px", padding: "16px 18px", background: "#fffbf0" }}>
                          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#92400e", marginBottom: "10px" }}>
                            ⚡ 집객·전환
                          </p>
                          <DemoBadge note="매칭된 브랜드 팝업을 이렇게 영상·인스타로 집객합니다 — Jae 제작 영상 슬롯" />
                          {/* 영상 슬롯 — Jae 제작 영상 파일 전달 후 src 교체 */}
                          <div style={{
                            width: "100%", aspectRatio: "16/9",
                            background: "#1a1a1a", borderRadius: "10px",
                            marginBottom: "12px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexDirection: "column", gap: "6px",
                          }}>
                            <span style={{ fontSize: "20px" }}>🎬</span>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontFamily: "inherit" }}>
                              메자닌 집객 영상 — 제작 후 교체 예정
                            </span>
                          </div>
                          <a
                            href="https://www.instagram.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "10px", background: "#111111", color: "white", fontSize: "13px", fontWeight: 700, textDecoration: "none", borderRadius: "8px", boxSizing: "border-box", marginBottom: "8px" }}
                          >
                            📲 인스타 → 방문 전환 →
                          </a>
                          <p style={{ fontSize: "10px", color: "#b45309", textAlign: "center", margin: 0 }}>
                            증산역까지의 유입을 영상·인스타로 디지털 집객합니다
                          </p>
                        </div>
                      );
                    }
                    const qMx = selectedProduct.matrix_x ?? 50;
                    const qMy = selectedProduct.matrix_y ?? 50;
                    if (!(qMx < 50 && qMy >= 50)) return null;
                    return (
                      <div style={{ border: "1px solid #fde68a", borderRadius: "8px", padding: "16px 18px", background: "#fffbf0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#92400e" }}>⚡ 전환 마케팅</p>
                          <span style={{ fontSize: "9px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e" }}>Quick Wins</span>
                        </div>
                        <p style={{ fontSize: "11px", color: "#b45309", marginBottom: "12px" }}>
                          밀어줄 상품. 전환형 영상 + 랜딩으로 연결됩니다.
                        </p>
                        <video
                          src="/videos/sugyeong_final.mp4"
                          controls
                          playsInline
                          style={{ width: "100%", borderRadius: "10px", marginBottom: "12px", background: "#0d0d0d", display: "block" }}
                        />
                        <a
                          href="https://sellfit.kr/landing/plant"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "10px", background: "#ef567c", color: "white", fontSize: "13px", fontWeight: 700, textDecoration: "none", borderRadius: "8px", boxSizing: "border-box", marginBottom: "8px" }}
                        >
                          랜딩 미리보기 →
                        </a>
                        <a
                          href="/pipeline"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", width: "100%", padding: "9px", background: "white", color: "#4a4f57", fontSize: "12px", fontWeight: 600, textDecoration: "none", borderRadius: "8px", boxSizing: "border-box", border: "1px solid #e8eaed" }}
                        >
                          📲 파이프라인 — 인스타 배포·측정 →
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>{/* /Matrix Card */}

      {/* 고객 매트릭스 — 상품 매트릭스 바로 아래 */}
      {mode === "sellfit" && storeId && (
        <div style={{
          background: "#ffffff",
          border: "1px solid #e8eaed",
          borderRadius: "8px",
          padding: "20px 24px",
          marginTop: "16px",
          height: "calc(100vh - 350px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <CustomerMatrix storeId={storeId} />
        </div>
      )}

      </div>{/* /Right Column inner (maxWidth:1232px) */}
      </div>{/* /Right Column outer (flex:1) */}
    </div>
    </div>
  );
}
