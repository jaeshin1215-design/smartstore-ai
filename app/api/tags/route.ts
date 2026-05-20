import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category } = await req.json();

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
      model: "anthropic/claude-3-haiku",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `당신은 네이버 스마트스토어 SEO 전문가입니다.
아래 상품에 최적화된 스마트스토어 태그 20개를 추천해주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "tags": ["태그1", "태그2", "태그3", ...]
}

태그 작성 규칙:
- 2~10자 이내로 간결하게
- 검색량 높은 키워드 위주
- 상품 특성, 용도, 대상, 브랜드 유형 다양하게 포함
- 중복 없이 20개`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ result: parsed.tags });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
