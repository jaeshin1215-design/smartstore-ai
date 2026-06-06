"use client";

import { useState, useEffect } from "react";

const CATEGORIES = ["압축팩", "다리미판", "유아매트", "화분"];

interface Product {
  id: string;
  name: string;
  url: string;
  keyword: string;
  category: string;
  price: number;
  is_own: number;
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
  const [, setDbReady] = useState(false);
  // 매출 입력
  const [salesRevenue, setSalesRevenue] = useState("");
  const [salesAdCost, setSalesAdCost] = useState("");
  const [salesAction, setSalesAction] = useState("");
  const [savingSales, setSavingSales] = useState(false);
  const [salesSaved, setSalesSaved] = useState(false);
  const [yesterdaySales, setYesterdaySales] = useState<{revenue?: number; ad_cost?: number} | null>(null);

  // 스토어 등록 폼
  const [storeName, setStoreName] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeKakao, setStoreKakao] = useState("");

  // 상품 등록 폼
  const [pName, setPName] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [pCategory, setPCategory] = useState("압축팩");
  const [pPrice, setPPrice] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pIsOwn, setPIsOwn] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<{product: string; searchVolume: number; cpc: number; competitors: number}[] | null>(null);

  useEffect(() => {
    initAndLoad();
  }, []);

  async function initAndLoad() {
    setLoading(true);
    try {
      // DB 초기화
      await fetch("/api/db/init", { method: "POST" });
      setDbReady(true);

      // 로컬에 저장된 스토어 ID 확인
      const savedStoreId = localStorage.getItem(STORE_KEY);
      const savedStoreInfo = localStorage.getItem(STORE_INFO_KEY);

      if (savedStoreId && savedStoreInfo) {
        const s = JSON.parse(savedStoreInfo);
        setStore(s);
        await loadProducts(savedStoreId);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function loadProducts(storeId: string) {
    const res = await fetch(`/api/products?store_id=${storeId}`);
    const data = await res.json();
    setProducts(data.products || []);
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
      setStore(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleAddProduct() {
    if (!store || !pName.trim() || !pKeyword.trim()) return;
    setAddingProduct(true);
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id, name: pName, url: pUrl,
          keyword: pKeyword, category: pCategory,
          price: pPrice, is_own: pIsOwn,
        }),
      });
      await loadProducts(store.id);
      setPName(""); setPKeyword(""); setPPrice(""); setPUrl("");
      setPCategory("압축팩"); setPIsOwn(true);
    } catch (e) { console.error(e); }
    setAddingProduct(false);
  }

  async function handleDeleteProduct(id: string) {
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p.id !== id));
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

  function handleReset() {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STORE_INFO_KEY);
    setStore(null);
    setProducts([]);
  }

  const ownProducts = products.filter(p => p.is_own === 1);
  const compProducts = products.filter(p => p.is_own === 0);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: 13 }}>
        DB 연결 중...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "#1a1b1e", marginBottom: 6 }}>
          내 스토어 설정
        </h2>
        <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
          자사 상품 + 경쟁사 상품을 한 번만 등록하면 — AI가 밤새 추적합니다.
        </p>
      </div>

      {/* 스토어 미등록 */}
      {!store && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "28px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 20 }}>
            스토어 등록 (1회만)
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
      )}

      {/* 스토어 등록됨 */}
      {store && (
        <>
          {/* 스토어 정보 */}
          <div style={{
            background: "#f7f8fa", borderRadius: 10, padding: "14px 18px",
            marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center",
            border: "1px solid #e8eaed"
          }}>
            <div>
              <span style={{ fontWeight: 500, color: "#1a1b1e", fontSize: 13 }}>{store.name}</span>
              {store.email && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 10 }}>{store.email}</span>}
            </div>
            <button onClick={handleReset}
              style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
              초기화
            </button>
          </div>

          {/* 상품 등록 폼 */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 16 }}>
              상품 등록
            </div>

            {/* 자사/경쟁사 토글 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[true, false].map(own => (
                <button key={String(own)}
                  onClick={() => setPIsOwn(own)}
                  style={{
                    padding: "8px 20px", borderRadius: 20, border: "1px solid",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    borderColor: pIsOwn === own ? "#0f2a1e" : "#e0ede9",
                    background: pIsOwn === own ? "#0f2a1e" : "#fff",
                    color: pIsOwn === own ? "#fff" : "#6b7280",
                  }}>
                  {own ? "자사 상품" : "경쟁사 상품"}
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

              <div>
                <span style={S.label}>스마트스토어 URL (선택)</span>
                <input style={S.input} placeholder="https://smartstore.naver.com/..."
                  value={pUrl} onChange={e => setPUrl(e.target.value)} />
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
            </div>
          </div>

          {/* 등록된 상품 목록 */}
          {products.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a1e", marginBottom: 16 }}>
                등록된 상품 ({ownProducts.length}개 자사 · {compProducts.length}개 경쟁사)
              </div>

              {[{ label: "자사 상품", list: ownProducts }, { label: "경쟁사 상품", list: compProducts }].map(group => (
                group.list.length > 0 && (
                  <div key={group.label} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 10 }}>
                      {group.label}
                    </div>
                    {group.list.map(p => (
                      <div key={p.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 0", borderBottom: "1px solid #f3f4f6",
                      }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f2a1e" }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                            {p.category} · {p.keyword}
                            {p.price ? ` · ${Number(p.price).toLocaleString()}원` : ""}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteProduct(p.id)}
                          style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                          삭제
                        </button>
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
            </div>
          )}
          {/* 매출 수동 입력 */}
          {store && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "24px", marginTop: 16 }}>
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
        </>
      )}
    </div>
  );
}
