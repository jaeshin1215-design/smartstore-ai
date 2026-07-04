export function createGeminiStream(prompt: string, maxTokens = 2000): ReadableStream<Uint8Array> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
  return new ReadableStream({
    async start(controller) {
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
              } catch { /* skip */ }
            }
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });
}

import Anthropic from "@anthropic-ai/sdk";

export async function callGemini(prompt: string, maxTokens = 500): Promise<string> {
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
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: Math.min(maxTokens, 8192),
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}
