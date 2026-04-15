import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, purchasePrice, competitorPrice } = await req.json();

  if (!productName || !category) {
    return NextResponse.json({ error: "상품명과 카테고리를 입력해주세요." }, { status: 400 });
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
          content: `당신은 네이버 스마트스토어 카테고리별 판매 전략 전문가입니다.
해당 카테고리에 최적화된 할인 전략과 상품 가치를 높이는 방법을 알려주세요.

상품명: ${productName}
카테고리: ${category}
매입가: ${purchasePrice ? purchasePrice + "원" : "미입력"}
경쟁사 최저가: ${competitorPrice ? competitorPrice + "원" : "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "category_insight": "이 카테고리의 네이버 쇼핑 트렌드와 특성",
  "discount_strategy": {
    "recommended_rate": "추천 할인율(%)",
    "original_price_tip": "정가를 얼마로 설정하면 좋은지",
    "method": "할인 방법 (쿠폰/즉시할인/묶음할인 중 추천)",
    "reason": "이 할인 전략을 추천하는 이유"
  },
  "value_add": [
    {
      "idea": "가치 더하기 아이디어",
      "cost": "예상 추가 비용",
      "effect": "기대 효과"
    }
  ],
  "bundle_idea": {
    "products": ["묶음 구성 상품1", "상품2"],
    "price_tip": "묶음 가격 전략",
    "benefit": "셀러 이점"
  },
  "season_promotions": [
    {
      "season": "시즌/기념일",
      "strategy": "프로모션 전략",
      "copy": "이벤트 문구"
    }
  ],
  "competitor_strategy": "경쟁사 대비 차별화 전략"
}

카테고리별 국내 스마트스토어 데이터 기반으로 분석:
- 식품/건강: 샘플 증정, 구성 변경이 효과적
- 의류/패션: 코디 제안, 사이즈 교환 정책이 전환율 상승
- 생활/주방: 사용 영상, 세트 구성이 객단가 상승
- 뷰티: 피부 타입별 추천, 용량 선택이 효과적
- 디지털: 보증, 사은품이 신뢰도 상승`,
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
