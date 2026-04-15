import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, highlight } = await req.json();

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
          content: `당신은 스마트스토어 썸네일 문구 전문가입니다.
클릭률을 높이는 썸네일 텍스트 문구 5세트를 만들어주세요.

상품명: ${productName}
강조할 점: ${highlight || "없음"}

다음 JSON 형식으로만 응답하세요:
{
  "sets": [
    {
      "main": "메인 문구 (10자 이내)",
      "sub": "서브 문구 (15자 이내)",
      "badge": "뱃지 문구 (6자 이내, 예: 당일발송, 1+1, 특가)"
    }
  ]
}

문구 작성 규칙:
- 짧고 강렬하게
- 숫자 활용 (예: 100%, 1+1, 3일만)
- 긴급성/희소성 표현 포함
- 신뢰감 주는 표현 활용`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ result: parsed.sets });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
