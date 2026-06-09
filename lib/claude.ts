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

export async function callClaude(prompt: string, maxTokens = 2000, useGrounding = false): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: Math.min(maxTokens * 4, 8192),
      // grounding과 thinkingConfig 동시 사용 불가 — grounding 켜면 thinking 제외
      ...(useGrounding ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
    },
  };
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${data.error?.message}`);
  // grounding 시 parts가 여러 개일 수 있음 — 모두 합침
  const parts = (data.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string }>;
  return parts.map(p => p.text ?? "").join("");
}
