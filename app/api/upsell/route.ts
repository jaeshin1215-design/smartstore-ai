import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, sellingPrice, targetCustomer } = await req.json();

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
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        {
          role: "user",
          content: `당신은 네이버 스마트스토어 업셀링 및 객단가 향상 전문가입니다.
고객의 구매 전환율과 객단가를 동시에 높이는 업셀링 전략을 만들어주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}
판매가: ${sellingPrice ? sellingPrice + "원" : "미입력"}
타겟 고객: ${targetCustomer || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "options": [
    {
      "name": "옵션 구성명",
      "description": "옵션 내용",
      "add_price": "추가 금액(원)",
      "reason": "이 옵션이 잘 팔리는 이유"
    }
  ],
  "bundles": [
    {
      "name": "묶음 구성명",
      "products": ["본 상품", "함께 넣을 상품1", "상품2"],
      "original_total": "개별 구매 시 총액(원)",
      "bundle_price": "묶음 가격(원)",
      "discount_rate": "할인율(%)",
      "selling_point": "묶음 판매 포인트"
    }
  ],
  "oneplus": {
    "suggestion": "1+1 또는 N+1 구성 제안",
    "price_strategy": "가격 전략",
    "psychology": "고객 심리 자극 포인트"
  },
  "cross_sell": [
    {
      "product": "함께 사면 좋은 상품",
      "reason": "왜 이 상품과 함께 사는가",
      "timing": "언제 제안할지 (상품 페이지/장바구니/구매 완료)"
    }
  ],
  "revenue_boost": {
    "current_aov": "현재 예상 객단가",
    "target_aov": "업셀링 적용 시 목표 객단가",
    "monthly_impact": "월 100명 구매 시 추가 예상 매출"
  },
  "copy_examples": ["업셀링 유도 문구1", "문구2", "문구3"]
}

전략 기준:
- 스마트스토어 객단가 향상의 핵심: 옵션 구성 + 묶음 할인
- 소모품/보조 상품은 크로스셀 효과가 높음
- 1+1 전략은 재고 회전율과 신규 고객 유입에 효과적
- 고객이 '더 사면 이득'이라는 인식 심어주기`,
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
