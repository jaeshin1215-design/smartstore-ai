import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, purchasePrice, shippingCost, competitorPrice, targetMargin, category, features } = await req.json();

  if (!productName || !purchasePrice) {
    return NextResponse.json({ error: "상품명과 매입가를 입력해주세요." }, { status: 400 });
  }

  const shipping = Number(shippingCost) || 3000;
  const platformFee = Math.round(Number(purchasePrice) * 0.0585);
  const totalCost = Number(purchasePrice) + shipping + platformFee;

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
          content: `당신은 네이버 스마트스토어 가격 전략 전문가입니다.
아래 상품의 최적 판매 가격을 분석해주세요.

상품명: ${productName}
매입가(원가): ${purchasePrice}원
배송비: ${shipping}원
스마트스토어 수수료(5.85%): ${platformFee}원
총 원가 합계: ${totalCost}원
경쟁사 최저가: ${competitorPrice ? competitorPrice + "원" : "미입력"}
목표 마진율: ${targetMargin ? targetMargin + "%" : "미입력 (적정 마진 추천)"}
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
- 위에서 계산된 총 원가(${totalCost}원) 기준으로 가격 책정
- 경쟁사 가격이 있으면 반드시 반영
- 목표 마진율이 있으면 그에 맞게 계산
- 최소 마진율 20% 이상 확보
- 네이버쇼핑 광고비 고려`,
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
