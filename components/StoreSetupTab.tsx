"use client";

import { useState, useEffect } from "react";
import PriceGuardBoard from "./PriceGuardBoard";

const CATEGORIES = ["압축팩", "다리미판", "유아매트", "화분"];

interface Product {
  id: string;
  name: string;
  url: string;
  keyword: string;
  category: string;
  price: number;
  purchase_price: number;
  shipping_cost: number;
  stock: number | null;
  is_own: number;
  coupang_url: string | null;
}

interface Store {
  id: string;
  name: string;
  email: string;
  kakao: string;
}

const S = {
  input: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid #e0ede9", background: "#fff", outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  label: { fontSize: 11, color: "#6b7280", letterSpacing: "0.06em", marginBottom: 4, display: "block" as const },
  select: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid #e0ede9", background: "#fff", outline: "none",
    fontFamily: "inherit", cursor: "pointer",
  } as React.CSSProperties,
};

const STORE_KEY = "sellfit_store_id";
const STORE_INFO_KEY = "sellfit_store_info";

export default function StoreSetupTab() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsError, setProductsError] = useState(false);
  // 매출 입력
  const [salesRevenue, setSalesRevenue] = useState("");
  const [salesAdCost, setSalesAdCost] = useState("");
  const [salesAction, setSalesAction] = useState("");
  const [savingSales, setSavingSales] = useState(false);
  const [salesSaved, setSalesSaved] = useState(false);
  const [yesterdaySales, setYesterdaySales] = useState<{revenue?: number; ad_cost?: number} | null>(null);

  // 운송장 업로드 state (발주 취합은 Inbox > 발주 처리로 이동, 2026-07-09)
  const [trackingRows, setTrackingRows] = useState([{ orderNo: "", trackingNo: "", courierCode: "", invoiceDate: new Date().toISOString().slice(0, 10).replace(/-/g, "") }]);
  const [uploadingTracking, setUploadingTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<{success_count: number; fail_count: number; message: string} | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // 스토어 등록 폼
  const [storeName, setStoreName] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeKakao, setStoreKakao] = useState("");
  // PIN 코드 (등록 직후 1회 표시 — 확장 연결용)
  const [newPin, setNewPin] = useState<string | null>(null);

  // 상품 등록 폼
  const [pName, setPName] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [pCategory, setPCategory] = useState("압축팩");
  const [pPrice, setPPrice] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pCoupangUrl, setPCoupangUrl] = useState("");
  const [pPurchasePrice, setPPurchasePrice] = useState("");
  const [pShippingCost, setPShippingCost] = useState("");
  const [pStock, setPStock] = useState("");
  const [pIsOwn, setPIsOwn] = useState(1); // 1=자사, 0=경쟁사, 2=소싱·위탁후보
  const [addingProduct, setAddingProduct] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // 기존 상품 쿠팡 URL 인라인 편집
  const [editingCoupangId, setEditingCoupangId] = useState<string | null>(null);
  const [editingCoupangUrl, setEditingCoupangUrl] = useState("");
  const [savingCoupangUrl, setSavingCoupangUrl] = useState(false);
  const [coupangUrlError, setCoupangUrlError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<{product: string; searchVolume: number; cpc: number; competitors: number}[] | null>(null);

  // 섹션 탭
  const [activeSection, setActiveSection] = useState("상품 등록");

  // 경쟁사 추적
  interface TrackingRecord {
    id: string;
    product_name: string;
    coupang_price: number | null;
    is_item_winner: number;
    check_date: string;
    safety_level: "안전" | "주의" | "위험" | null;
    registered_margin_pct: number | null;
    coupang_margin_pct: number | null;
    margin_diff_pct: number | null;
    winner_target_price: number | null;
    judgment_reason: string | null;
  }
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [tProductId, setTProductId] = useState("");
  const [tCoupangPrice, setTCoupangPrice] = useState("");
  const [tIsItemWinner, setTIsItemWinner] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [boardKey, setBoardKey] = useState(0); // 수동 보정 후 보드 갱신용

  useEffect(() => {
    initAndLoad();
  }, []);

  // 로그인 세션의 store_id로 스토어 자동 로드 (2026-07-10) — PIN 입력 불필요
  async function initAndLoad() {
    try {
      const res = await fetch("/api/stores", { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (data.store) {
        const s = { id: data.store.id, name: data.store.name, email: data.store.email, kakao: data.store.kakao };
        localStorage.setItem(STORE_KEY, s.id);
        localStorage.setItem(STORE_INFO_KEY, JSON.stringify(s));
        setStore(s);
        loadProducts(s.id);
      }
    } catch {
      // 네트워크 실패 시 로컬 캐시 폴백 (화면 블로킹 없음)
      const savedStoreInfo = localStorage.getItem(STORE_INFO_KEY);
      if (savedStoreInfo) {
        try { const s = JSON.parse(savedStoreInfo); setStore(s); loadProducts(s.id); } catch { /* 무시 */ }
      }
    }
  }

  async function loadProducts(storeId: string) {
    setProductsError(false);
    try {
      const res = await fetch(`/api/products?store_id=${storeId}`, {
        signal: AbortSignal.timeout(10000), // hang 방지
      });
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setProductsError(true);
    }
  }

  async function handleRegisterStore() {
    if (!storeName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: storeName, email: storeEmail, kakao: storeKakao }),
      });
      const data = await res.json();
      const s = { id: data.id, name: storeName, email: storeEmail, kakao: storeKakao };
      localStorage.setItem(STORE_KEY, data.id);
      localStorage.setItem(STORE_INFO_KEY, JSON.stringify(s));
      setNewPin(data.pin);
      setStore(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleAddProduct() {
    if (!store) return;
    // 빠진 필수 항목을 명시적으로 알림 (조용한 무시 금지)
    const missing: string[] = [];
    if (!pName.trim()) missing.push("상품명");
    if (!pKeyword.trim()) missing.push("분석 키워드");
    if (missing.length > 0) {
      setAddError(`${missing.join(" · ")} 입력이 필요합니다. 이미 등록된 상품에 쿠팡 URL만 붙이려면 아래 목록에서 "쿠팡 URL 연결"을 누르세요.`);
      return;
    }
    setAddError(null);
    setAddingProduct(true);
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id, name: pName, url: pUrl,
          keyword: pKeyword, category: pCategory,
          price: pPrice, purchase_price: pPurchasePrice,
          shipping_cost: pShippingCost, stock: pStock, is_own: pIsOwn,
          coupang_url: pCoupangUrl,
        }),
      });
      await loadProducts(store.id);
      setPName(""); setPKeyword(""); setPPrice(""); setPPurchasePrice("");
      setPShippingCost(""); setPStock(""); setPUrl(""); setPCoupangUrl(""); setPCategory("압축팩"); setPIsOwn(1);
    } catch (e) { console.error(e); }
    setAddingProduct(false);
  }

  async function handleDeleteProduct(id: string) {
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  // 기존 상품에 쿠팡 URL 연결 (Price Guard 추적 대상 등록)
  // 조용한 실패 금지 (2026-07-10): res.ok 확인, 실패 시 편집창 유지 + 에러 표시 + 입력 보존
  async function handleSaveCoupangUrl(productId: string) {
    if (!store) return;
    setSavingCoupangUrl(true);
    setCoupangUrlError(null);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, coupang_url: editingCoupangUrl.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCoupangUrlError(data.error ?? "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setSavingCoupangUrl(false);
        return; // 편집창 유지, 입력값 보존
      }
      await loadProducts(store.id);
      setEditingCoupangId(null);
      setEditingCoupangUrl("");
    } catch {
      setCoupangUrlError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setSavingCoupangUrl(false);
  }

  async function handleCollect() {
    if (!store) return;
    setCollecting(true);
    setCollectResult(null);
    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: store.id }),
      });
      const data = await res.json();
      if (data.collected) setCollectResult(data.collected);
    } catch (e) { console.error(e); }
    setCollecting(false);
  }

  async function loadYesterdaySales(sid: string) {
    try {
      const res = await fetch(`/api/sales?store_id=${sid}`);
      const data = await res.json();
      if (data.sales?.length > 0) setYesterdaySales(data.sales[0]);
    } catch { /* 무시 */ }
  }

  async function handleSaveSales() {
    if (!store) return;
    setSavingSales(true);
    try {
      await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          revenue: salesRevenue ? parseInt(salesRevenue) : null,
          ad_cost: salesAdCost ? parseInt(salesAdCost) : null,
          action_result: salesAction || null,
        }),
      });
      setSalesSaved(true);
      setSalesRevenue(""); setSalesAdCost(""); setSalesAction("");
      await loadYesterdaySales(store.id);
      setTimeout(() => setSalesSaved(false), 3000);
    } catch { /* 무시 */ }
    setSavingSales(false);
  }

  const ownProducts = products.filter(p => p.is_own === 1);
  const compProducts = products.filter(p => p.is_own === 0);
  const candidateProducts = products.filter(p => p.is_own === 2);

  // 접속 시 전체 화면 블로킹 없음 — loading은 스토어 신규 등록 처리 중에만 true
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: 13 }}>
        처리 중...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", gap: "40px", alignItems: "flex-start" }}>

      {/* LEFT: sticky sidebar */}
      <div style={{ width: "200px", flexShrink: 0, background: "#F7F8FA", borderRadius: "8px", padding: "14px 12px", borderRight: "1px solid #e8eaed", position: "sticky", top: "60px" }}>
        <p style={{ fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>SETUP</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.4, marginBottom: "6px" }}>한 번만 등록하면 끝</p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.5 }}>자사·경쟁사 상품 등록</p>
        {["상품 등록", "가격 추적", "매출 입력", "발주·운송장"].map(f => (
          <div key={f}
            onClick={() => setActiveSection(f)}
            style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", cursor: "pointer", borderRadius: 6, padding: "4px 6px", background: activeSection === f ? "#fff3f6" : "transparent" }}>
            <span style={{ fontSize: "10px", color: activeSection === f ? "#ef567c" : "#c0c4cc", flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: "13px", color: activeSection === f ? "#ef567c" : "#8f9399", fontWeight: activeSection === f ? 700 : 400 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* RIGHT: main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: "1232px", margin: "0 auto" }}>
      <div style={{ paddingBottom: "24px", marginBottom: "24px", borderBottom: "1px solid #e8eaed" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0d0d0e", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Set It Once.
        </h1>
        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: "0 0 8px" }}>한 번만 등록하면 끝.</p>
        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
          자사 상품 + 경쟁사 상품을 한 번만 등록하면 — AI가 밤새 추적합니다.
        </p>
      </div>

      {/* 스토어 미등록 — 세션에 연결된 스토어가 없을 때만(최초 등록용) */}
      {!store && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* 신규 등록 */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "22px 28px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 20 }}>
              스토어 신규 등록
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <span style={S.label}>스토어 이름 *</span>
                <input style={S.input} placeholder="예) 이지스토리"
                  value={storeName} onChange={e => setStoreName(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={S.label}>이메일 (리포트 수신용)</span>
                  <input style={S.input} placeholder="예) idaseul@easystory.kr"
                    value={storeEmail} onChange={e => setStoreEmail(e.target.value)} />
                </div>
                <div>
                  <span style={S.label}>카카오 전화번호 (알림용)</span>
                  <input style={S.input} placeholder="예) 01012345678"
                    value={storeKakao} onChange={e => setStoreKakao(e.target.value)} />
                </div>
              </div>
              <button
                onClick={handleRegisterStore}
                style={{
                  padding: "12px", borderRadius: 8, border: "none",
                  background: "#ef567c", color: "#fff", fontSize: 14,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                등록하기 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 직후 PIN 코드 1회 표시 */}
      {store && newPin && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12,
          padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>스토어 코드 발급 완료</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "0.25em", color: "#0f2a1e" }}>{newPin}</div>
          <div style={{ fontSize: 12, color: "#166534" }}>
            이 코드로 언제든 다른 기기에서 스토어를 불러올 수 있습니다. 카카오 메모 등에 저장해두세요.
          </div>
          <button
            onClick={() => setNewPin(null)}
            style={{
              alignSelf: "flex-start", marginTop: 4, padding: "6px 14px",
              borderRadius: 6, border: "1px solid #86efac", background: "#fff",
              fontSize: 12, color: "#166534", cursor: "pointer",
            }}
          >
            확인했습니다
          </button>
        </div>
      )}

      {/* 스토어 등록됨 */}
      {store && (
        <>
          {/* 스토어 정보 — 스토어명만 표시 (등록자 개인 이메일 노출 제거·초기화 제거, 2026-07-10) */}
          <div style={{
            background: "#f7f8fa", borderRadius: 10, padding: "14px 18px",
            marginBottom: 24, border: "1px solid #e8eaed"
          }}>
            <span style={{ fontWeight: 500, color: "#1a1b1e", fontSize: 13 }}>{store.name}</span>
          </div>

          {/* 상품 로드 실패 폴백 — 화면은 그대로 두고 재시도만 제공 */}
          {productsError && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
              padding: "12px 16px", marginBottom: 20, display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 13, color: "#dc2626" }}>상품 목록을 불러오지 못했습니다.</span>
              <button
                onClick={() => store && loadProducts(store.id)}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid #fecaca",
                  background: "#fff", fontSize: 12, color: "#dc2626", fontWeight: 600, cursor: "pointer",
                }}>
                다시 시도
              </button>
            </div>
          )}

          {/* ── 가격 추적 (Price Guard) 섹션 ── */}
          {activeSection === "가격 추적" && (() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            async function handleSaveTracking() {
              if (!tProductId || !store) return;
              setSavingTracking(true);
              try {
                // 수동 보정도 자동 수집과 같은 원천(price_captures)에 적재
                await fetch("/api/price-capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    store_id: store.id,
                    source: "manual",
                    product_id: tProductId,
                    price: tCoupangPrice ? Number(tCoupangPrice) : null,
                    is_item_winner: tIsItemWinner,
                  }),
                });
                setBoardKey(k => k + 1); // 보드 즉시 갱신
                setTProductId(""); setTCoupangPrice(""); setTIsItemWinner(false);
              } catch (e) { console.error(e); }
              setSavingTracking(false);
            }
            async function loadTracking() {
              if (!store) return;
              const res = await fetch(`/api/competitor-tracking?store_id=${store.id}`);
              const data = await res.json();
              setTrackingRecords(data.records || []);
            }
            if (trackingRecords.length === 0) loadTracking();
            return (
              <div>
                {/* Price Guard 자동화 보드 */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 2 }}>Price Guard</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>매일 자동 수집 — 쿠팡 마진율 기준 안전/주의/위험 판정</div>
                </div>
                <PriceGuardBoard key={boardKey} storeId={store.id} />

                {/* 수동 보정 폼 */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 4 }}>수동 보정</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>자동 수집이 누락된 날만 여기로 직접 기록 — 보드에 바로 반영</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <span style={S.label}>자사 상품 선택 *</span>
                      <select style={S.select} value={tProductId} onChange={e => setTProductId(e.target.value)}>
                        <option value="">— 상품 선택 —</option>
                        {ownProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <span style={S.label}>쿠팡 판매가 (원)</span>
                        <input style={S.input} type="number" placeholder="예) 35900"
                          value={tCoupangPrice} onChange={e => setTCoupangPrice(e.target.value)} />
                      </div>
                      <div>
                        <span style={S.label}>아이템위너 여부</span>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          {[true, false].map(v => (
                            <button key={String(v)}
                              onClick={() => setTIsItemWinner(v)}
                              style={{
                                flex: 1, padding: "10px", borderRadius: 8, border: "1px solid",
                                fontSize: 13, fontWeight: 600, cursor: "pointer",
                                borderColor: tIsItemWinner === v ? "#0f2a1e" : "#e0ede9",
                                background: tIsItemWinner === v ? "#0f2a1e" : "#fff",
                                color: tIsItemWinner === v ? "#fff" : "#6b7280",
                              }}>
                              {v ? "Y (위너)" : "N (비위너)"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#9ca3af" }}>
                      확인일자: {todayStr} (자동 기록)
                    </div>
                    <button onClick={handleSaveTracking} disabled={savingTracking || !tProductId}
                      style={{
                        padding: "11px", borderRadius: 8, border: "none",
                        background: !tProductId ? "#e8eaed" : savingTracking ? "#c4c8cc" : "#ef567c",
                        color: "#fff", fontSize: 13, fontWeight: 600, cursor: tProductId ? "pointer" : "default",
                      }}>
                      {savingTracking ? "저장 중..." : "기록하기 →"}
                    </button>
                  </div>
                </div>

                {/* 과거 수기 기록 (읽기 전용 아카이브) */}
                {trackingRecords.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 16 }}>
                      과거 수기 기록 ({trackingRecords.length}건)
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e8eaed" }}>
                            {["확인일자", "상품명", "쿠팡 판매가", "아이템위너", "판정", "마진차이", "탈환 목표가"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {trackingRecords.map(r => {
                            const safetyColor =
                              r.safety_level === "안전" ? { bg: "#dcfce7", color: "#15803d" }
                              : r.safety_level === "주의" ? { bg: "#fef9c3", color: "#854d0e" }
                              : r.safety_level === "위험" ? { bg: "#fee2e2", color: "#dc2626" }
                              : { bg: "#f3f4f6", color: "#9ca3af" };
                            return (
                              <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "10px", color: "#6b7280", whiteSpace: "nowrap" }}>{r.check_date}</td>
                                <td style={{ padding: "10px", color: "#0f2a1e", fontWeight: 600 }}>{r.product_name}</td>
                                <td style={{ padding: "10px", color: "#374151", whiteSpace: "nowrap" }}>
                                  {r.coupang_price ? Number(r.coupang_price).toLocaleString() + "원" : "—"}
                                </td>
                                <td style={{ padding: "10px" }}>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                                    background: r.is_item_winner ? "#dcfce7" : "#f3f4f6",
                                    color: r.is_item_winner ? "#15803d" : "#6b7280",
                                  }}>
                                    {r.is_item_winner ? "위너" : "비위너"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px" }}>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 10,
                                    background: safetyColor.bg, color: safetyColor.color,
                                  }} title={r.judgment_reason ?? ""}>
                                    {r.safety_level ?? "—"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px", color: "#374151", whiteSpace: "nowrap" }}>
                                  {r.margin_diff_pct != null ? `${r.margin_diff_pct}%p` : "—"}
                                </td>
                                <td style={{ padding: "10px", color: "#374151", whiteSpace: "nowrap" }}>
                                  {r.winner_target_price ? Number(r.winner_target_price).toLocaleString() + "원" : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {trackingRecords.length === 0 && (
                  <div style={{ background: "#f9fafb", borderRadius: 12, border: "1px dashed #e0ede9", padding: "32px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>아직 기록 없음 — 위 폼으로 첫 번째 기록을 남겨보세요</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 매출 입력 섹션 ── */}
          {activeSection === "매출 입력" && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 4 }}>오늘 매출 입력</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>매일 5분 · 30일 누적 = PoC 결과 보고서</div>
              {yesterdaySales && (
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#6b7280" }}>
                  어제: 매출 {yesterdaySales.revenue ? Number(yesterdaySales.revenue).toLocaleString() + "원" : "—"}
                  {yesterdaySales.ad_cost ? ` · 광고비 ${Number(yesterdaySales.ad_cost).toLocaleString()}원` : ""}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <span style={S.label}>오늘 매출 (원)</span>
                  <input style={S.input} type="number" placeholder="예) 1768000"
                    value={salesRevenue} onChange={e => setSalesRevenue(e.target.value)} />
                </div>
                <div>
                  <span style={S.label}>광고비 (원)</span>
                  <input style={S.input} type="number" placeholder="예) 102000"
                    value={salesAdCost} onChange={e => setSalesAdCost(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={S.label}>어제 액션 결과 (선택)</span>
                <input style={S.input} placeholder="예) 상품명 수정 후 클릭 +15%"
                  value={salesAction} onChange={e => setSalesAction(e.target.value)} />
              </div>
              <button onClick={handleSaveSales} disabled={savingSales}
                style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none",
                  background: salesSaved ? "#4a4f57" : savingSales ? "#c4c8cc" : "#4a4f57",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {salesSaved ? "저장 완료" : savingSales ? "저장 중..." : "오늘 매출 저장 →"}
              </button>
            </div>
          )}

          {/* ── 발주·운송장 섹션 ── */}
          {activeSection === "발주·운송장" && (() => {
            async function uploadTracking() {
              const items = trackingRows.filter(r => r.orderNo.trim() && r.trackingNo.trim());
              if (!items.length) return;
              setUploadingTracking(true);
              setTrackingError(null);
              setTrackingResult(null);
              try {
                const res = await fetch("/api/sabangnet/tracking", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items }),
                });
                const data = await res.json();
                if (!res.ok) setTrackingError(data.error ?? "업로드 실패");
                else setTrackingResult(data);
              } catch { setTrackingError("네트워크 오류"); }
              setUploadingTracking(false);
            }

            const todayFmt = new Date().toISOString().slice(0, 10).replace(/-/g, "");

            return (
              <div>
                {/* API 키 안내 */}
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#92400e" }}>
                  ⚠️ 사방넷 API 키 미설정 시 503 응답. <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>SABANGNET_API_KEY</code> + <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4, fontSize: 12 }}>SABANGNET_SHOP_ID</code> 설정 후 활성화.
                </div>

                {/* 발주 취합 → Inbox 발주 처리로 이동 안내 (구 라우트 삭제, 2026-07-09) */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 4 }}>발주 취합</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                    <b>Inbox 탭 → 발주 처리</b>로 이동했습니다. 사방넷 주문을 CJ 송장 엑셀·세트분리 송장 매칭 파일로 바로 내려받을 수 있습니다.
                  </div>
                </div>

                {/* 운송장 업로드 */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 4 }}>운송장 업로드</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>Phase 1 세트분리 결과 → 사방넷 운송장 자동 등록</div>

                  {trackingRows.map((row, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input style={{ ...S.input, fontSize: 12 }} placeholder="주문번호"
                        value={row.orderNo} onChange={e => setTrackingRows(prev => prev.map((r, i) => i === idx ? { ...r, orderNo: e.target.value } : r))} />
                      <input style={{ ...S.input, fontSize: 12 }} placeholder="운송장번호"
                        value={row.trackingNo} onChange={e => setTrackingRows(prev => prev.map((r, i) => i === idx ? { ...r, trackingNo: e.target.value } : r))} />
                      <input style={{ ...S.input, fontSize: 12 }} placeholder="택배사코드"
                        value={row.courierCode} onChange={e => setTrackingRows(prev => prev.map((r, i) => i === idx ? { ...r, courierCode: e.target.value } : r))} />
                      <input style={{ ...S.input, fontSize: 12 }} placeholder={todayFmt}
                        value={row.invoiceDate} onChange={e => setTrackingRows(prev => prev.map((r, i) => i === idx ? { ...r, invoiceDate: e.target.value } : r))} />
                      {trackingRows.length > 1 && (
                        <button onClick={() => setTrackingRows(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                      )}
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => setTrackingRows(prev => [...prev, { orderNo: "", trackingNo: "", courierCode: "", invoiceDate: todayFmt }])}
                      style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e0ede9", background: "#f9fafb", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      + 행 추가
                    </button>
                    <button onClick={uploadTracking} disabled={uploadingTracking}
                      style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: uploadingTracking ? "#c4c8cc" : "#0f2a1e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: uploadingTracking ? "default" : "pointer" }}>
                      {uploadingTracking ? "등록 중..." : "사방넷에 운송장 등록 →"}
                    </button>
                  </div>

                  {trackingError && (
                    <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#dc2626" }}>
                      ⚠️ {trackingError}
                    </div>
                  )}

                  {trackingResult && (
                    <div style={{ marginTop: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#15803d" }}>
                      ✓ {trackingResult.message} (성공 {trackingResult.success_count}건 · 실패 {trackingResult.fail_count}건)
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── 상품 등록 섹션 ── */}
          {activeSection === "상품 등록" && (
          <>
          {/* 상품 등록 폼 */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 16 }}>
              상품 등록
            </div>

            {/* 자사/경쟁사/소싱·위탁후보 토글 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {([1, 0, 2] as const).map(val => (
                <button key={val}
                  onClick={() => setPIsOwn(val)}
                  style={{
                    padding: "8px 20px", borderRadius: 20, border: "1px solid",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    borderColor: pIsOwn === val ? "#0f2a1e" : "#e0ede9",
                    background: pIsOwn === val ? "#0f2a1e" : "#fff",
                    color: pIsOwn === val ? "#fff" : "#6b7280",
                  }}>
                  {val === 1 ? "자사 상품" : val === 0 ? "경쟁사 상품" : "소싱·위탁후보"}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <span style={S.label}>상품명 *</span>
                  <input style={S.input} placeholder="예) 이지백 프리미엄 압축팩 10L"
                    value={pName} onChange={e => setPName(e.target.value)} />
                </div>
                <div>
                  <span style={S.label}>카테고리 *</span>
                  <select style={S.select} value={pCategory} onChange={e => setPCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={S.label}>분석 키워드 *</span>
                  <input style={S.input} placeholder="예) 압축팩"
                    value={pKeyword} onChange={e => setPKeyword(e.target.value)} />
                </div>
                <div>
                  <span style={S.label}>판매가 (원)</span>
                  <input style={S.input} type="number" placeholder="예) 12900"
                    value={pPrice} onChange={e => setPPrice(e.target.value)} />
                </div>
              </div>

              {/* 매입가 + 배송비 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={S.label}>매입가 (원) *</span>
                  <input style={S.input} type="number" placeholder="예) 7200"
                    value={pPurchasePrice} onChange={e => setPPurchasePrice(e.target.value)} />
                </div>
                <div>
                  <span style={S.label}>배송비 (원)</span>
                  <input style={S.input} type="number" placeholder="예) 2500"
                    value={pShippingCost} onChange={e => setPShippingCost(e.target.value)} />
                </div>
              </div>

              {/* 재고 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={S.label}>현재 재고 (개)</span>
                  <input style={S.input} type="number" placeholder="예) 50"
                    value={pStock} onChange={e => setPStock(e.target.value)} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>재고 0 + 광고비 집행 중이면 이상탐지 배지가 표시됩니다</span>
                </div>
              </div>

              <div>
                <span style={S.label}>스마트스토어 URL (선택)</span>
                <input style={S.input} placeholder="https://smartstore.naver.com/..."
                  value={pUrl} onChange={e => setPUrl(e.target.value)} />
              </div>

              <div>
                <span style={{ ...S.label, color: "#be123c", fontWeight: 700 }}>★ 쿠팡 상품 URL (신규)</span>
                <input
                  style={{ ...S.input, border: "1.5px solid #f9a8c4", background: "#fff7f9" }}
                  placeholder="coupang.com/vp/products/..."
                  value={pCoupangUrl} onChange={e => setPCoupangUrl(e.target.value)} />
                <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, display: "block" }}>
                  ← 여기에 쿠팡 주소를 한 번만 넣어두면, 매일 이 상품을 자동 추적
                </span>
              </div>

              <button
                onClick={handleAddProduct}
                disabled={addingProduct}
                style={{
                  padding: "11px", borderRadius: 8, border: "none",
                  background: addingProduct ? "#c4c8cc" : "#ef567c",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                {addingProduct ? "등록 중..." : "+ 상품 추가"}
              </button>
              {addError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#dc2626" }}>
                  ⚠️ {addError}
                </div>
              )}
            </div>
          </div>

          {/* 등록된 상품 목록 */}
          {products.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 16 }}>
                등록된 상품 ({ownProducts.length}개 자사 · {compProducts.length}개 경쟁사 · {candidateProducts.length}개 소싱후보)
              </div>

              {/* ⚠️ 이상탐지 배너 */}
              {(() => {
                const storeHasAdSpend = (yesterdaySales?.ad_cost ?? 0) > 0;
                const flags: { name: string; reason: string }[] = [];
                for (const p of ownProducts) {
                  if (p.price === null || p.price === 0) {
                    flags.push({ name: p.name, reason: "판매가 미입력" });
                  } else if (p.purchase_price && Number(p.purchase_price) > Number(p.price)) {
                    flags.push({ name: p.name, reason: `원가(${Number(p.purchase_price).toLocaleString()}원) > 판매가(${Number(p.price).toLocaleString()}원) — 역마진` });
                  }
                  if (p.stock === 0 && storeHasAdSpend) {
                    flags.push({ name: p.name, reason: `재고 0 + 광고비 집행 중(${Number(yesterdaySales!.ad_cost).toLocaleString()}원) — 광고 낭비 위험` });
                  }
                }
                if (flags.length === 0) return null;
                return (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                      ⚠️ 이상탐지 ({flags.length}건) — 즉시 확인 필요
                    </div>
                    {flags.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#b91c1c", padding: "4px 0", borderTop: i > 0 ? "1px solid #fecaca" : "none" }}>
                        <span style={{ fontWeight: 600 }}>{f.name.length > 20 ? f.name.slice(0, 20) + "…" : f.name}</span>
                        {" "}{f.reason}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>

              {[{ label: "자사 상품", list: ownProducts }, { label: "경쟁사 상품", list: compProducts }, { label: "소싱·위탁후보", list: candidateProducts }].map(group => (
                group.list.length > 0 && (
                  <div key={group.label} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 10 }}>
                      {group.label}
                    </div>
                    {group.list.map(p => (
                      <div key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f2a1e" }}>{p.name}</span>
                            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                              {p.category} · {p.keyword}
                              {p.price ? ` · 판매가 ${Number(p.price).toLocaleString()}원` : ""}
                              {p.purchase_price ? ` · 매입가 ${Number(p.purchase_price).toLocaleString()}원` : ""}
                              {p.shipping_cost ? ` · 배송비 ${Number(p.shipping_cost).toLocaleString()}원` : ""}
                              {p.stock != null ? ` · 재고 ${Number(p.stock)}개` : ""}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                            <button
                              onClick={() => {
                                setEditingCoupangId(editingCoupangId === p.id ? null : p.id);
                                setEditingCoupangUrl(p.coupang_url ?? "");
                                setCoupangUrlError(null);
                              }}
                              style={{
                                fontSize: 11, background: "none", border: "none", cursor: "pointer",
                                color: p.coupang_url ? "#15803d" : "#be123c", fontWeight: 600,
                              }}>
                              {p.coupang_url ? "쿠팡 ✓" : "쿠팡 URL 연결"}
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)}
                              style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                              삭제
                            </button>
                          </div>
                        </div>
                        {editingCoupangId === p.id && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                              쿠팡 상품 페이지 주소를 붙여넣고 저장을 누르세요
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                style={{ ...S.input, fontSize: 12, border: "1.5px solid #f9a8c4", background: "#fff7f9" }}
                                placeholder="coupang.com/vp/products/..."
                                value={editingCoupangUrl}
                                onChange={e => { setEditingCoupangUrl(e.target.value); setCoupangUrlError(null); }}
                                onKeyDown={e => e.key === "Enter" && handleSaveCoupangUrl(p.id)}
                              />
                              <button
                                onClick={() => handleSaveCoupangUrl(p.id)}
                                disabled={savingCoupangUrl}
                                style={{
                                  padding: "8px 16px", borderRadius: 8, border: "none", whiteSpace: "nowrap",
                                  background: savingCoupangUrl ? "#c4c8cc" : "#0f2a1e", color: "#fff",
                                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                                }}>
                                {savingCoupangUrl ? "저장 중..." : "저장"}
                              </button>
                            </div>
                            {coupangUrlError && (
                              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>⚠ {coupangUrlError}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ))}

              {ownProducts.length > 0 && compProducts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    padding: "12px 16px", background: "#f7f9fb",
                    borderRadius: 8, fontSize: 12, color: "#64676b", marginBottom: 12,
                    border: "1px solid #e8eaed"
                  }}>
                    설정 완료 — AI가 매일 새벽 {ownProducts.length}개 자사 상품 + {compProducts.length}개 경쟁사를 추적합니다.
                  </div>
                  <button
                    onClick={handleCollect}
                    disabled={collecting}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 8, border: "none",
                      background: collecting ? "#c4c8cc" : "#4a4f57",
                      color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                    {collecting ? "수집 중... (DataLab·SearchAd·쇼핑 API)" : "지금 데이터 수집 (테스트)"}
                  </button>
                  {collectResult && (
                    <div style={{ marginTop: 16, background: "#fff", borderRadius: 8, border: "1px solid #e0ede9", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", background: "#0f2a1e" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>수집 결과</span>
                      </div>
                      {collectResult.map((r, i) => (
                        <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: "#0f2a1e", fontWeight: 600 }}>{r.product}</span>
                          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                            <span>검색량 {r.searchVolume}%</span>
                            <span>경쟁 {r.competitors.toLocaleString()}개</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>{/* /scroll wrapper */}
            </div>
          )}
          </>
          )}
        </>
      )}
    </div>
      </div>{/* /centering wrapper */}
  </div>
  );
}
