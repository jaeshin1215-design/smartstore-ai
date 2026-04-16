import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { inquiry } = await req.json();

  if (!inquiry) {
    return NextResponse.json({ error: "문의 내용을 입력해주세요." }, { status: 400 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        {
          role: "user",
          content: `당신은 친절하고 전문적인 스마트스토어 고객 응대 담당자입니다.
아래 고객 문의에 대한 답변 초안을 작성해주세요.

고객 문의:
${inquiry}

답변 작성 규칙:
- 정중하고 친절한 말투 사용 (합쇼체)
- 고객의 불편함에 먼저 공감
- 명확하고 실용적인 해결책 제시
- 마지막에 추가 문의 환영 표현 포함
- 200~300자 내외로 간결하게 작성
- 이모지 1~2개 자연스럽게 활용`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "결과를 가져오지 못했습니다.";
  return NextResponse.json({ result: text });
}
