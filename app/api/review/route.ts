import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { review, type } = await req.json();

  if (!review) {
    return NextResponse.json({ error: "리뷰 내용을 입력해주세요." }, { status: 400 });
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
          content: `당신은 친절한 스마트스토어 판매자입니다.
아래 고객 리뷰에 대한 답글을 작성해주세요.

리뷰 유형: ${type === "positive" ? "긍정 리뷰" : "부정 리뷰"}
고객 리뷰:
${review}

답글 작성 규칙:
- 정중하고 따뜻한 말투 (합쇼체)
- 긍정 리뷰: 감사 인사 + 재구매 유도
- 부정 리뷰: 공감 + 사과 + 해결 의지 표현
- 100~150자 이내로 짧고 진심 있게
- 이모지 1개 자연스럽게 포함`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "결과를 가져오지 못했습니다.";
  return NextResponse.json({ result: text });
}
