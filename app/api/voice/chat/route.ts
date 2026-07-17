export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Message[] };
  if (!messages?.length) {
    return NextResponse.json({ error: "메시지가 없습니다." }, { status: 400 });
  }

  const history = messages
    .map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.text}`)
    .join("\n");

  const prompt = `당신은 스마트스토어 셀러를 위한 친절한 AI 파트너입니다.
상품 등록, SEO, 가격 전략, 트렌드, 광고 등 스마트스토어 관련 질문에 답변하세요.
답변은 짧고 실용적으로 (3문장 이내). 말로 듣기 좋은 자연스러운 문체로 작성하세요.

대화 내역:
${history}

AI:`;

  try {
    const raw = await callClaude(prompt, 250, { feature: "voice-chat" });
    const text = raw.replace(/^AI:\s*/i, "").trim();
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 오류" },
      { status: 500 }
    );
  }
}
