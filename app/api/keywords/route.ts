import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName } = await req.json();

  if (!productName) {
    return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });
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
          content: `당신은 네이버 스마트스토어 SEO 전문가입니다.
아래 상품명을 분석하여 검색 상위 노출에 효과적인 키워드 10개를 추천해주세요.

상품명: ${productName}

다음 JSON 형식으로만 응답하세요. 다른 설명은 하지 마세요:
{
  "keywords": [
    { "keyword": "키워드1", "tip": "활용법 설명" },
    { "keyword": "키워드2", "tip": "활용법 설명" }
  ]
}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ result: parsed.keywords });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
