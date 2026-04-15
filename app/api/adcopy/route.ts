import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, purchasePrice, sellingPrice, targetCustomer, features } = await req.json();

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
      messages: [
        {
          role: "user",
          content: `당신은 네이버 쇼핑 광고 및 전환율 최적화 전문가입니다.
아래 상품의 구매 전환율을 높이는 광고 전략을 만들어주세요.

상품명: ${productName}
매입가: ${purchasePrice ? purchasePrice + "원" : "미입력"}
판매가: ${sellingPrice ? sellingPrice + "원" : "미입력"}
타겟 고객: ${targetCustomer || "미입력"}
상품 특징: ${features || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "ad_copies": [
    {
      "title": "광고 제목 (15자 이내)",
      "description": "광고 설명 (45자 이내)",
      "keyword": "입찰 추천 키워드"
    }
  ],
  "discount_strategy": {
    "original_price": "정가로 표시할 가격(숫자만)",
    "sale_price": "할인 판매가(숫자만)",
    "discount_rate": "할인율(숫자만)",
    "reason": "이 할인 전략을 추천하는 이유"
  },
  "conversion_tips": ["전환율 높이는 팁1", "팁2", "팁3"],
  "review_strategy": "초기 리뷰 확보 전략"
}

전략 수립 기준:
- 네이버 쇼핑 알고리즘: 높은 정가 + 할인율 표시가 유리
- 세부 키워드 광고가 대형 키워드보다 효율적
- 구매 전환율 높이는 심리적 요소 활용
- 초기 리뷰 확보가 매출에 직결`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ result: parsed });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
