import { logLlmUsage, geminiTokens, claudeTokens, type LlmLogMeta } from "./llm-usage";

const GEMINI_MODEL = "gemini-2.5-flash";
const CLAUDE_MODEL = "claude-sonnet-4-6";

export function createGeminiStream(prompt: string, maxTokens = 2000, meta?: LlmLogMeta): ReadableStream<Uint8Array> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
  return new ReadableStream({
    async start(controller) {
      let usage = { input: 0, output: 0 };
      let ok = false;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: Math.min(maxTokens * 4, 8192),
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });
        if (!res.ok) {
          if (res.status === 429) {
            controller.error(new Error("GEMINI_RATE_LIMIT"));
            return;
          }
          const err = await res.json().catch(() => ({}));
          controller.error(new Error(`Gemini ${res.status}: ${(err as { error?: { message?: string } }).error?.message ?? "error"}`));
          return;
        }
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (text) controller.enqueue(new TextEncoder().encode(text));
                // usageMetadata는 스트림 마지막 청크에 누적값으로 옴 — 최신값 유지
                if (data.usageMetadata) usage = geminiTokens(data);
              } catch { /* skip */ }
            }
          }
        }
        ok = true;
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
        // fail-safe: 로깅은 응답 종료 후, 실패해도 무시
        await logLlmUsage({ ...meta, model: GEMINI_MODEL, input_tokens: usage.input, output_tokens: usage.output, success: ok });
      }
    },
  });
}

import Anthropic from "@anthropic-ai/sdk";

export async function callGemini(prompt: string, maxTokens = 500, meta?: LlmLogMeta): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) {
    await logLlmUsage({ ...meta, model: GEMINI_MODEL, input_tokens: 0, output_tokens: 0, success: false });
    throw new Error(`Gemini ${res.status}`);
  }
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const t = geminiTokens(data);
  await logLlmUsage({ ...meta, model: GEMINI_MODEL, input_tokens: t.input, output_tokens: t.output, success: true });
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function callClaude(prompt: string, maxTokens = 2000, meta?: LlmLogMeta): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: Math.min(maxTokens, 8192),
      messages: [{ role: "user", content: prompt }],
    });
    const t = claudeTokens(msg);
    await logLlmUsage({ ...meta, model: CLAUDE_MODEL, input_tokens: t.input, output_tokens: t.output, success: true });
    const block = msg.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  } catch (e) {
    await logLlmUsage({ ...meta, model: CLAUDE_MODEL, input_tokens: 0, output_tokens: 0, success: false });
    throw e;
  }
}
