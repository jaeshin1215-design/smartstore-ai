import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, dailyBudget, sellingPrice } = await req.json();

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
          content: `당신은 네이버 쇼핑 검색광고 전문가입니다.
초기 셀러가 적은 예산으로 최대 효과를 내는 키워드 입찰 전략을 만들어주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}
일 광고 예산: ${dailyBudget ? dailyBudget + "원" : "미입력"}
판매가: ${sellingPrice ? sellingPrice + "원" : "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "keywords": [
    {
      "keyword": "키워드",
      "type": "대형/중형/소형",
      "estimated_cpc": "예상 클릭당 비용(원)",
      "competition": "높음/중간/낮음",
      "recommended": true or false,
      "reason": "추천 이유"
    }
  ],
  "strategy": {
    "phase1": "1~2주차 전략 (초기 데이터 수집)",
    "phase2": "3~4주차 전략 (최적화)",
    "phase3": "2개월 이후 전략 (확장)"
  },
  "budget_allocation": {
    "small_keywords": "소형 키워드에 예산 배분 %",
    "medium_keywords": "중형 키워드에 예산 배분 %",
    "reason": "이렇게 배분하는 이유"
  },
  "roi_estimate": "예상 광고 ROI 설명",
  "tips": ["광고 운영 팁1", "팁2", "팁3"]
}

전략 수립 기준:
- 네이버 쇼핑 광고: 소형 키워드(롱테일)가 초기 셀러에게 유리
- 클릭당 비용 대비 전환율 최적화
- 일 예산 3~10만원 수준으로 시작 권장
- 초기 2주는 데이터 수집 목적으로 운영`,
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
