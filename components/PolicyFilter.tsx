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
      <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2">
        <span>✅</span>
        <span>네이버 정책 위반 표현이 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
      {/* 요약 배지 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700">⚠️ 네이버 정책 검토 필요</span>
        {result.bannedCount > 0 && (
          <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
            금지 {result.bannedCount}건
          </span>
        )}
        {result.warningCount > 0 && (
          <span className="text-xs font-bold bg-yellow-400 text-white px-2 py-0.5 rounded-full">
            주의 {result.warningCount}건
          </span>
        )}
      </div>

      {/* 위반 목록 */}
      <ul className="space-y-1">
        {result.violations.map((v: PolicyViolation, i: number) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
            <span className={v.level === "banned" ? "text-red-500 font-bold" : "text-yellow-600 font-bold"}>
              {v.level === "banned" ? "🚫" : "⚠️"}
            </span>
            <span>
              <strong className={v.level === "banned" ? "text-red-500" : "text-yellow-600"}>
                「{v.match}」
              </strong>{" "}
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
