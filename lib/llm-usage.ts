// LLM 호출·토큰 로깅 (프라이싱 원가 실측용, 2026-07-17)
// fail-safe 원칙: 로깅 실패는 절대 LLM 응답을 막지 않는다. 모든 경로 try-catch로 삼킨다.
import { db } from "./db";
import { randomUUID } from "crypto";

export interface LlmLogMeta {
  feature?: string;      // 라우트/기능명 (예: "reply", "content", "seo")
  storeId?: string | null;
}

interface LlmLogRow extends LlmLogMeta {
  model: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
}

/** 순수 기록. 실패해도 조용히 무시(응답 흐름 보호). await 해도 되고 안 해도 됨. */
export async function logLlmUsage(row: LlmLogRow): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO sellfit_llm_usage
              (id, created_at, store_id, feature, model, input_tokens, output_tokens, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        Date.now(),
        row.storeId ?? null,
        row.feature ?? null,
        row.model,
        Math.max(0, Math.round(row.input_tokens || 0)),
        Math.max(0, Math.round(row.output_tokens || 0)),
        row.success ? 1 : 0,
      ],
    });
  } catch {
    /* 로깅 실패는 무시 — LLM 응답을 막지 않는다 */
  }
}

/** Gemini generateContent 응답에서 토큰 추출 (usageMetadata) */
export function geminiTokens(data: unknown): { input: number; output: number } {
  const u = (data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })?.usageMetadata;
  return { input: u?.promptTokenCount ?? 0, output: u?.candidatesTokenCount ?? 0 };
}

/** Anthropic messages.create 응답에서 토큰 추출 (usage) */
export function claudeTokens(msg: unknown): { input: number; output: number } {
  const u = (msg as { usage?: { input_tokens?: number; output_tokens?: number } })?.usage;
  return { input: u?.input_tokens ?? 0, output: u?.output_tokens ?? 0 };
}
