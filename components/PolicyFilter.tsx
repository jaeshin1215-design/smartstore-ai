"use client";

import { useMemo } from "react";
import { filterNaverPolicy, PolicyViolation } from "@/lib/naverPolicyFilter";

interface Props {
  text: string;
}

export default function PolicyFilter({ text }: Props) {
  const result = useMemo(() => filterNaverPolicy(text), [text]);

  if (!result.hasViolation) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm rounded-lg px-4 py-2"
        style={{ background: "#f9fafb", border: "1px solid #e8eaed", color: "#4a4f57" }}>
        <span>✓</span>
        <span>네이버 정책 위반 표현이 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl p-4 space-y-3"
      style={{ background: "white", border: "1px solid #e8eaed" }}>
      {/* 요약 배지 — 파스텔 칩 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold" style={{ color: "#4a4f57" }}>⚠️ 네이버 정책 검토 필요</span>
        {result.bannedCount > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
            금지 {result.bannedCount}건
          </span>
        )}
        {result.warningCount > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md"
            style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309" }}>
            주의 {result.warningCount}건
          </span>
        )}
      </div>

      {/* 위반 목록 */}
      <ul className="space-y-1">
        {result.violations.map((v: PolicyViolation, i: number) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#4a4f57" }}>
            <span style={{ color: v.level === "banned" ? "#b91c1c" : "#b45309", fontWeight: 600 }}>
              {v.level === "banned" ? "🚫" : "⚠️"}
            </span>
            <span>
              <span className="font-medium px-1 py-0.5 rounded text-xs"
                style={v.level === "banned"
                  ? { background: "#fef2f2", color: "#b91c1c" }
                  : { background: "#fffbeb", color: "#b45309" }}>
                「{v.match}」
              </span>{" "}
              — {v.reason}
            </span>
          </li>
        ))}
      </ul>

      {/* 하이라이트 미리보기 */}
      <div className="mt-2">
        <p className="text-xs text-gray-500 mb-1">하이라이트 미리보기</p>
        <div
          className="text-xs bg-white rounded-lg p-3 border border-red-100 leading-relaxed whitespace-pre-wrap policy-preview"
          dangerouslySetInnerHTML={{ __html: result.highlightedText }}
        />
      </div>

      <style jsx>{`
        .policy-preview :global(.policy-banned) {
          background-color: #fee2e2;
          color: #dc2626;
          font-weight: 700;
          border-radius: 2px;
          padding: 0 2px;
        }
        .policy-preview :global(.policy-warning) {
          background-color: #fef9c3;
          color: #b45309;
          font-weight: 700;
          border-radius: 2px;
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
}
