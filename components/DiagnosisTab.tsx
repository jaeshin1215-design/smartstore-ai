"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MatrixBox, { getProductColor } from "./MatrixBox";
import PolicyFilter from "./PolicyFilter";

const STORE_KEY = "sellfit_store_id";

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
}

export default function DiagnosisTab({ onSeoNavigate }: { onSeoNavigate?: (keyword: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Hover sync state (matrix ↔ left list)
  const [hoverProductId, setHoverProductId] = useState<string | null>(null);

  // Matrix Option States (⚙️ Settings Dropdown)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [activeView, setActiveView] = useState<"all" | "quick_wins" | "major_projects" | "fill_ins" | "thankless_tasks">("all");
  const [scaleDots, setScaleDots] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showPartially, setShowPartially] = useState(true);
  const viewsRef = useRef<HTMLDivElement | null>(null);

  // Drawer Panel States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comments, setComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  // 직관 노트 + 결정 (상품별 로컬 상태)
  const [intuitionNotes, setIntuitionNotes] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [offerDrafts, setOfferDrafts] = useState<Record<string, OfferDraft>>({});
  const [offerLoading, setOfferLoading] = useState(false);

  const settingsRef = useRef<HTMLDivElement | null>(null);

  const loadProducts = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/products?store_id=${sid}`);
      const json = await res.json();
      const list = json.products || [];
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
    const sid = localStorage.getItem(STORE_KEY);
    if (sid) {
      setStoreId(sid);
      loadProducts(sid);
    } else {
      setLoading(false);
    }
  }, [loadProducts]);

  // Click outside listener for settings dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
      if (viewsRef.current && !viewsRef.current.contains(event.target as Node)) {
        setViewsOpen(false);
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
    setOfferLoading(true);
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
          decision: decisions[selectedProductId] || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) setOfferDrafts(prev => ({ ...prev, [selectedProductId]: data }));
      }
    } catch { /* 실패해도 진행 */ }
    finally { setOfferLoading(false); }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, newComment]);
    setNewComment("");
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
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "80px 0", 
        color: "#8f9399", 
        fontSize: "13px", 
        fontFamily: "'Pretendard', sans-serif" 
      }}>
        📌 설정 탭에서 스토어를 먼저 등록해주세요.
      </div>
    );
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);

  /* 사분면 필터 */
  const filteredProducts = activeView === "all" ? products : products.filter(p => {
    const mx = p.matrix_x ?? 50;
    const my = p.matrix_y ?? 50;
    if (activeView === "quick_wins")      return mx < 50 && my >= 50;
    if (activeView === "major_projects")  return mx >= 50 && my >= 50;
    if (activeView === "fill_ins")        return mx < 50 && my < 50;
    if (activeView === "thankless_tasks") return mx >= 50 && my < 50;
    return true;
  });

  /* Frill 파스텔 칩 — border 있는 옅은 칩 */
  const getProductStatus = (p: Product) => {
    if (p.is_own === 1) return { label: "Planned", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" };
    if (p.is_own === 2) return { label: "Under consideration", bg: "#fdf2f8", border: "#f5d0e4", text: "#9d174d" };
    return { label: "In Development", bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" };
  };

  const getProductQuadrant = (p: Product) => {
    const mx = p.matrix_x !== null && p.matrix_x !== undefined ? p.matrix_x : 50;
    const my = p.matrix_y !== null && p.matrix_y !== undefined ? p.matrix_y : 50;
    if (mx >= 50 && my >= 50) return { label: "Major Projects", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" };
    if (mx < 50 && my >= 50) return { label: "Quick Wins", bg: "#fefce8", border: "#fde68a", text: "#92400e" };
    if (mx < 50 && my < 50) return { label: "Fill Ins", bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" };
    return { label: "Thankless Tasks", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" };
  };

  return (
    <div style={{
      display: "flex",
      gap: "24px",
      width: "100%",
      height: "calc(100vh - 180px)",
      minHeight: "560px",
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      alignItems: "stretch"
    }}>
      {/* ── Left Sidebar (Ideas / Products List) ── */}
      <div style={{
        width: "260px",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}>
        {/* Header row */}
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
            Ideas ({products.length})
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
          {products.map((p) => {
            const isSelected = p.id === selectedProductId;
            const isHovered = p.id === hoverProductId;
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
                }}
                onMouseEnter={() => setHoverProductId(p.id)}
                onMouseLeave={() => setHoverProductId(null)}
                style={{
                  background: isSelected ? "#f4f5f7" : "#ffffff",
                  border: `1px solid ${isSelected ? "#d1d5db" : "#e5e7eb"}`,
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
                <span style={{ fontSize: "13px", fontWeight: isSelected ? 600 : 400, color: isActive ? dotColor : "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, transition: "color 0.15s ease" }}>
                  {p.name}
                </span>
                <i className="ti ti-dots-horizontal" style={{ fontSize: "12px", color: "#9ca3af", opacity: isActive ? 1 : 0 }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel (Matrix Graph Area & Drawer Overlay) ── */}
      <div style={{
        flex: 1,
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
                  { id: "part",   label: "Show partially prioriti...", state: showPartially, setter: setShowPartially }
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
              onSeoNavigate={onSeoNavigate}
              showLabels={showLabels}
              showGrid={showGrid}
              hoverProductId={hoverProductId}
              setHoverProductId={setHoverProductId}
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
                <h3 style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0d0d0e",
                  margin: 0
                }}>
                  Admin
                </h3>

                {/* Meta list parameters */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Status row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64676b", fontWeight: 600 }}>
                      <i className="ti ti-circle-dot" style={{ fontSize: "12px" }}></i>
                      <span>Status</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: getProductStatus(selectedProduct).bg,
                        border: `1px solid ${getProductStatus(selectedProduct).border}`,
                        color: getProductStatus(selectedProduct).text,
                        whiteSpace: "nowrap"
                      }}>
                        {getProductStatus(selectedProduct).label}
                      </span>
                      <i className="ti ti-chevron-right" style={{ fontSize: "10px", color: "#8f9399" }}></i>
                    </div>
                  </div>

                  {/* Priority / Quadrant row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64676b", fontWeight: 600 }}>
                      <i className="ti ti-layout-grid" style={{ fontSize: "12px" }}></i>
                      <span>Priority</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: getProductQuadrant(selectedProduct).bg,
                        border: `1px solid ${getProductQuadrant(selectedProduct).border}`,
                        color: getProductQuadrant(selectedProduct).text,
                        whiteSpace: "nowrap"
                      }}>
                        {getProductQuadrant(selectedProduct).label}
                      </span>
                      <i className="ti ti-chevron-right" style={{ fontSize: "10px", color: "#8f9399" }}></i>
                    </div>
                  </div>

                  {/* Visibility row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64676b", fontWeight: 600 }}>
                      <i className="ti ti-eye" style={{ fontSize: "12px" }}></i>
                      <span>Visibility</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#0d0d0e", fontWeight: 500 }}>Public</span>
                      <i className="ti ti-chevron-right" style={{ fontSize: "10px", color: "#8f9399" }}></i>
                    </div>
                  </div>
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
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "10px" }}>📊 AI 진단</p>
                    {/* Data chips */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: getProductQuadrant(selectedProduct).bg, border: `1px solid ${getProductQuadrant(selectedProduct).border}`, color: getProductQuadrant(selectedProduct).text }}>
                        {getProductQuadrant(selectedProduct).label}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "#f9fafb", border: "1px solid #e8eaed", color: "#4a4f57" }}>
                        수요 {selectedProduct.matrix_x ?? 50}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "#f9fafb", border: "1px solid #e8eaed", color: "#4a4f57" }}>
                        마진율 {selectedProduct.matrix_y ?? 50}
                      </span>
                    </div>
                    {/* Diagnosis text */}
                    <p style={{ fontSize: "12px", color: "#4a4f57", lineHeight: 1.65, marginBottom: "12px" }}>
                      {selectedProduct.is_own === 1
                        ? `현재 ${getProductQuadrant(selectedProduct).label} 영역. 마진율을 방어하며 검색지수가 급상승하도록 SEO 최적화를 즉각 수행하세요. 상품명 공백 제거 및 핵심 속성 태그 보완을 권장합니다.`
                        : `현재 ${getProductQuadrant(selectedProduct).label} 영역. 경쟁 키워드 입찰 한계선(CPC 350원 상한)을 고려하여 광고 효율을 모니터링하세요.`}
                    </p>
                    {/* Attribute chips */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                      {[
                        `키워드: ${selectedProduct.keyword}`,
                        `가격: ${selectedProduct.price.toLocaleString()}원`,
                        `매입가: ${selectedProduct.purchase_price.toLocaleString()}원`,
                      ].map(t => (
                        <span key={t} style={{ fontSize: "10px", padding: "2px 8px", background: "#f9fafb", border: "1px solid #e8eaed", borderRadius: "5px", color: "#6b7280" }}>{t}</span>
                      ))}
                    </div>
                    {/* SEO CTA */}
                    <button onClick={() => onSeoNavigate?.(selectedProduct.keyword)}
                      style={{ padding: "7px 14px", borderRadius: "6px", border: "none", background: "#ef567c", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Pretendard', sans-serif" }}>
                      🧭 SEO 최적화 →
                    </button>
                  </div>

                  {/* ■ Section 2: 직관 노트 (사람 입력) */}
                  <div style={{ border: "1px solid #e8eaed", borderRadius: "8px", padding: "16px 18px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "4px" }}>✏️ 직관 노트</p>
                    <p style={{ fontSize: "11px", color: "#b0b5bc", marginBottom: "10px" }}>
                      데이터로 안 잡히는 현장 감. 이다슬·빈 대표의 직접 메모.
                    </p>
                    <textarea
                      placeholder='"스테디다 / 호응도 좋다 / 재고 빠진다"'
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
                      {["개발", "소싱", "위탁", "관리유지", "철수"].map(d => {
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
                          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>📣 오퍼 설계</p>
                          <button
                            onClick={handleGenerateOffer}
                            disabled={offerLoading}
                            style={{
                              padding: "5px 12px", borderRadius: "5px", border: "none",
                              background: offerLoading ? "#f0f1f3" : "#ef567c",
                              color: offerLoading ? "#9ca3af" : "white",
                              fontSize: "11px", fontWeight: 600, cursor: offerLoading ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {offerLoading ? "생성 중..." : "AI 초안 생성"}
                          </button>
                        </div>
                        <p style={{ fontSize: "11px", color: "#b0b5bc", marginBottom: "12px" }}>
                          AI 초안 → 빈 대표·이다슬이 현장 감각으로 다듬기
                        </p>

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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
