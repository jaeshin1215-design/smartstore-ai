import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, purchasePrice, category, features } = await req.json();

  if (!productName || !purchasePrice) {
    return NextResponse.json({ error: "상품명과 매입가를 입력해주세요." }, { status: 400 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      messages: [
        {
          role: "user",
          content: `당신은 네이버 스마트스토어 가격 전략 전문가입니다.
아래 상품의 최적 판매 가격을 분석해주세요.

상품명: ${productName}
매입가(원가): ${purchasePrice}원
카테고리: ${category || "미입력"}
상품 특징: ${features || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "recommended_price": 추천판매가(숫자만),
  "min_price": 최소판매가(숫자만),
  "max_price": 최대판매가(숫자만),
  "margin_rate": 예상마진율(숫자만, % 단위),
  "strategy": "가격 전략 설명 (2~3문장)",
  "tips": ["팁1", "팁2", "팁3"]
}

분석 기준:
- 스마트스토어 수수료 약 5.5% 반영
- 배송비 평균 3,000원 반영
- 네이버쇼핑 광고비 고려
- 경쟁 상품 대비 적정 마진 확보
- 최소 마진율 20% 이상 권장`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    // 마크다운 코드블록 제거 (```json ... ``` 형태 처리)
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // 숫자 필드 강제 변환
    const result = {
      recommended_price: Number(parsed.recommended_price) || 0,
      min_price: Number(parsed.min_price) || 0,
      max_price: Number(parsed.max_price) || 0,
      margin_rate: Number(parsed.margin_rate) || 0,
      strategy: parsed.strategy || "",
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    };

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
