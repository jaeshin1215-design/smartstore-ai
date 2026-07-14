"use client";

import { useState } from "react";

interface ProductInput {
  name: string;
  price: string;
  reviews: string;
  keyword: string;
  category: string;
}

interface ProductResult {
  name: string;
  price: string;
  reviews: number;
  keyword: string;
  category: string;
  searchVolume: number;
  competitors: number;
}

interface CompareResult {
  productA: ProductResult;
  productB: ProductResult;
  analysis: string;
}

const CATEGORIES = [
  "압축팩", "다리미판", "화분", "유아매트",
  "생활용품", "수납/정리", "기타",
];

const S = {
  label: { fontSize: 11, color: "#6b7280", letterSpacing: "0.06em", marginBottom: 4, display: "block" as const },
  input: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid #e0ede9", background: "#fff", outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  select: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid #e0ede9", background: "#fff", outline: "none",
    fontFamily: "inherit", cursor: "pointer",
  } as React.CSSProperties,
  card: {
    background: "#fff", borderRadius: 12, border: "1px solid #e0ede9",
    padding: "20px", flex: 1, minWidth: 260,
  } as React.CSSProperties,
};

function InputCard({
  label, color, data, onChange,
}: {
  label: string;
  color: string;
  data: ProductInput;
  onChange: (k: keyof ProductInput, v: string) => void;
}) {
  return (
    <div style={S.card}>
      <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.1em", marginBottom: 16 }}>
        {label}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <span style={S.label}>상품명 *</span>
          <input style={S.input} placeholder="예) 프리미엄 압축팩 10L"
            value={data.name} onChange={e => onChange("name", e.target.value)} />
        </div>
        <div>
          <span style={S.label}>분석 키워드 * <span style={{ color: "#9ca3af" }}>(검색량 조회에 사용)</span></span>
          <input style={S.input} placeholder="예) 압축팩"
            value={data.keyword} onChange={e => onChange("keyword", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <span style={S.label}>판매가 (원)</span>
            <input style={S.input} placeholder="예) 12900"
              type="number" value={data.price} onChange={e => onChange("price", e.target.value)} />
          </div>
          <div>
            <span style={S.label}>리뷰 수</span>
            <input style={S.input} placeholder="예) 1240"
              type="number" value={data.reviews} onChange={e => onChange("reviews", e.target.value)} />
          </div>
        </div>
        <div>
          <span style={S.label}>카테고리</span>
          <select style={S.select} value={data.category} onChange={e => onChange("category", e.target.value)}>
            <option value="">선택</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function parseAnalysis(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e8f5f0;font-weight:700;">$1</strong>')
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

const EMPTY: ProductInput = { name: "", price: "", reviews: "", keyword: "", category: "" };

export default function CompareTab() {
  const [a, setA] = useState<ProductInput>({ ...EMPTY });
  const [b, setB] = useState<ProductInput>({ ...EMPTY });
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateA = (k: keyof ProductInput, v: string) => setA(prev => ({ ...prev, [k]: v }));
  const updateB = (k: keyof ProductInput, v: string) => setB(prev => ({ ...prev, [k]: v }));

  const handleCompare = async () => {
    if (!a.name.trim() || !b.name.trim()) {
      setError("두 상품의 상품명을 입력해 주세요.");
      return;
    }
    if (!a.keyword.trim() || !b.keyword.trim()) {
      setError("분석 키워드를 입력해 주세요. (예: 압축팩)");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/compare-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productA: a, productB: b }),
      });
      if (!res.ok) throw new Error("분석 실패");
      const data: CompareResult = await res.json();
      setResult(data);
    } catch {
      setError("분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setA({ ...EMPTY });
    setB({ ...EMPTY });
    setError("");
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f2a1e", marginBottom: 6 }}>
          상품 비교 분석
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          두 상품 정보 입력 → DataLab·쇼핑 데이터 연결 →
          <strong style={{ color: "#00aa6c" }}> "안 팔리는 이유 3가지 + 개선 액션"</strong>
        </p>
      </div>

      {/* 입력 영역 */}
      {!result && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start", flexWrap: "wrap" as const }}>
            <InputCard label="상품 A — 분석 대상 (덜 팔리는 것)" color="#ef4444" data={a} onChange={updateA} />
            <div style={{ display: "flex", alignItems: "center", fontSize: 18, color: "#9ca3af", paddingTop: 60, flexShrink: 0 }}>vs</div>
            <InputCard label="상품 B — 비교 기준 (잘 팔리는 것)" color="#00aa6c" data={b} onChange={updateB} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>
          )}

          <button
            onClick={handleCompare}
            disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: loading ? "#9ca3af" : "#0f2a1e", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading
              ? "분석 중... (DataLab·쇼핑·Gemini 연결 중)"
              : "비교 분석 →"}
          </button>
        </>
      )}

      {/* 결과 */}
      {result && (
        <div>
          {/* 데이터 비교 테이블 */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e0ede9", padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 16 }}>
              데이터 비교
            </div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e0ede9" }}>
                    <th style={{ textAlign: "left" as const, padding: "8px 12px", color: "#6b7280", fontWeight: 600, fontSize: 12 }}>항목</th>
                    <th style={{ textAlign: "right" as const, padding: "8px 12px", color: "#ef4444", fontWeight: 700, fontSize: 12 }}>상품 A</th>
                    <th style={{ textAlign: "right" as const, padding: "8px 12px", color: "#00aa6c", fontWeight: 700, fontSize: 12 }}>상품 B</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "상품명",
                      a: result.productA.name,
                      b: result.productB.name,
                    },
                    {
                      label: "판매가",
                      a: result.productA.price ? Number(result.productA.price).toLocaleString() + "원" : "—",
                      b: result.productB.price ? Number(result.productB.price).toLocaleString() + "원" : "—",
                    },
                    {
                      label: "리뷰 수",
                      a: result.productA.reviews ? result.productA.reviews.toLocaleString() + "개" : "—",
                      b: result.productB.reviews ? result.productB.reviews.toLocaleString() + "개" : "—",
                    },
                    {
                      label: "검색 트렌드 (DataLab)",
                      a: result.productA.searchVolume > 0 ? result.productA.searchVolume + "%" : "조회 불가",
                      b: result.productB.searchVolume > 0 ? result.productB.searchVolume + "%" : "조회 불가",
                    },
                    {
                      label: "경쟁 상품 수",
                      a: result.productA.competitors > 0 ? result.productA.competitors.toLocaleString() + "개" : "—",
                      b: result.productB.competitors > 0 ? result.productB.competitors.toLocaleString() + "개" : "—",
                    },
                  ].map((row) => (
                    <tr key={row.label} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>{row.label}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const, color: "#0f2a1e", fontWeight: 500 }}>{row.a}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" as const, color: "#0f2a1e", fontWeight: 500 }}>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gemini 분석 */}
          <div style={{ background: "#0f2a1e", borderRadius: 12, padding: "28px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", marginBottom: 16 }}>
              AI 진단 · DataLab + 쇼핑 데이터 기반
            </div>
            <div
              style={{ fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 2 }}
              dangerouslySetInnerHTML={{ __html: parseAnalysis(result.analysis) }}
            />
          </div>

          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" as const, marginBottom: 16 }}>
            ⚠ 네이버 DataLab·쇼핑 API 기반 추정. 실제 판매량과 다를 수 있습니다.
          </p>

          <button
            onClick={handleReset}
            style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #e0ede9", borderRadius: 8,
              fontSize: 13, color: "#6b7280", cursor: "pointer",
            }}
          >
            다시 분석하기
          </button>
        </div>
      )}
    </div>
  );
}
