import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, features } = await req.json();

  if (!productName || !category || !features) {
    return NextResponse.json({ error: "입력값이 부족합니다." }, { status: 400 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        {
          role: "user",
          content: `당신은 네이버 스마트스토어 상품 설명문 전문가입니다.
아래 정보를 바탕으로 구매 전환율이 높은 상품 설명문을 작성해주세요.

상품명: ${productName}
카테고리: ${category}
주요 특징:
${features.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

작성 규칙:
- 감성적이고 신뢰감 있는 문체 사용
- 핵심 혜택을 먼저 강조
- 구매 욕구를 자극하는 표현 포함
- 500~700자 내외로 작성
- 이모지 적절히 활용
- 단락을 나눠 가독성 높이기`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "결과를 가져오지 못했습니다.";
  return NextResponse.json({ result: text });
}
