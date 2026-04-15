"use client";

import { useState } from "react";

interface Section { title: string; content: string; tip: string; }
interface Faq { question: string; answer: string; }
interface StoryResult {
  hook: string;
  problem: string;
  solution: string;
  evidence: string;
  sections: Section[];
  cta: string;
  urgency: string;
  faq: Faq[];
}

export default function StoryTab() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [problem, setProblem] = useState("");
  const [features, setFeatures] = useState("");
  const [result, setResult] = useState<StoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!productName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, category, targetCustomer, problem, features }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (!result) return;
    const text = `[후킹 문구] ${result.hook}\n\n[문제 공감] ${result.problem}\n\n[해결책] ${result.solution}\n\n[신뢰 증거] ${result.evidence}\n\n[긴급성] ${result.urgency}\n\n[구매 유도] ${result.cta}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>🛒 구매 전환율 상세페이지</h2>
      <p className="text-gray-400 text-sm mb-6">고객이 이탈하지 않고 결제까지 이어지는 스토리텔링 상세페이지를 만들어드려요</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품명 <span className="text-red-400">*</span></label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 국산 유기농 아로니아 분말 500g"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>카테고리</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="예) 식품 > 건강식품"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>타겟 고객</label>
          <input type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
            placeholder="예) 건강에 관심 있는 30~50대 여성"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>고객의 불편함/문제</label>
          <input type="text" value={problem} onChange={(e) => setProblem(e.target.value)}
            placeholder="예) 건강식품 고르기 어렵고 맛이 없어서 꾸준히 못 먹음"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1a1a2e" }}>상품 특징</label>
          <input type="text" value={features} onChange={(e) => setFeatures(e.target.value)}
            placeholder="예) 유기농 인증, 국산, 무농약, 당일 발송"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
        </div>

        <button onClick={handleSubmit} disabled={loading || !productName}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              상세페이지 구성 중...
            </span>
          ) : "🛒 상세페이지 구성 만들기"}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <button onClick={handleCopyAll}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
              style={{ background: copied ? "#e8f9f0" : "#e8f0fe", color: copied ? "#2d9653" : "#4361ee" }}>
              {copied ? "✓ 복사됨!" : "📋 전체 복사"}
            </button>
          </div>

          {/* 후킹 문구 */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <p className="text-xs text-white/70 mb-1">⚡ 첫 3초 후킹 문구</p>
            <p className="text-lg font-bold text-white">{result.hook}</p>
          </div>

          {/* 문제 공감 */}
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-xs font-bold text-red-500 mb-2">😓 문제 공감 (고객 마음 잡기)</p>
            <p className="text-sm text-red-700 leading-relaxed">{result.problem}</p>
          </div>

          {/* 해결책 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-500 mb-2">✅ 해결책 제시</p>
            <p className="text-sm text-blue-700 leading-relaxed">{result.solution}</p>
          </div>

          {/* 신뢰 증거 */}
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs font-bold text-green-600 mb-2">🏆 신뢰 증거</p>
            <p className="text-sm text-green-700 leading-relaxed">{result.evidence}</p>
          </div>

          {/* 섹션 구성 */}
          {result.sections?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>📋 상세페이지 섹션 구성</p>
              <div className="space-y-2">
                {result.sections.map((sec, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>{i + 1}</span>
                      <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{sec.title}</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-1 ml-7">{sec.content}</p>
                    <p className="text-xs text-indigo-500 ml-7">📷 {sec.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 긴급성 + CTA */}
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-xs font-bold text-orange-500 mb-2">🔥 긴급성 문구</p>
            <p className="text-sm font-bold text-orange-700">{result.urgency}</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
            <p className="text-xs text-white/80 mb-1">🛒 구매 유도 문구</p>
            <p className="font-bold text-white">{result.cta}</p>
          </div>

          {/* FAQ */}
          {result.faq?.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: "#1a1a2e" }}>❓ 자주 묻는 질문 (FAQ)</p>
              <div className="space-y-2">
                {result.faq.map((f, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-bold mb-1" style={{ color: "#1a1a2e" }}>Q. {f.question}</p>
                    <p className="text-sm text-gray-600">A. {f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
