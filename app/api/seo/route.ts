import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, keywords, searchVolume, competitorCount, clickRate, priceRange } = await req.json();

  if (!productName) {
    return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });
  }

  const itemscoutData = (searchVolume || competitorCount || clickRate || priceRange)
    ? `\n[아이템스카우트 실제 데이터]\n월간 검색량: ${searchVolume || "미입력"}\n경쟁 상품 수: ${competitorCount || "미입력"}\n클릭 경쟁률: ${clickRate || "미입력"}\n상위 상품 가격대: ${priceRange || "미입력"}`
    : "";

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
아래 상품의 검색 상위 노출을 위한 최적화된 상품명을 만들어주세요.

현재 상품명: ${productName}
카테고리: ${category || "미입력"}
강조 키워드: ${keywords || "미입력"}${itemscoutData}

다음 JSON 형식으로만 응답하세요:
{
  "score": {
    "current": "현재 상품명 SEO 점수 (0~100)",
    "issues": ["현재 상품명의 문제점1", "문제점2"]
  },
  "optimized_names": [
    {
      "name": "최적화된 상품명",
      "reason": "이 상품명을 추천하는 이유",
      "keywords_used": ["사용된 키워드1", "키워드2"],
      "expected_score": "예상 SEO 점수 (0~100)"
    }
  ],
  "keyword_strategy": {
    "main_keyword": "메인 키워드 (검색량 많지만 경쟁 있음)",
    "sub_keywords": ["세부 키워드1 (롱테일)", "세부 키워드2", "세부 키워드3"],
    "recommendation": "아이템스카우트 데이터 기반 키워드 전략 조언"
  },
  "seo_tips": ["팁1", "팁2", "팁3"],
  "avoid": ["피해야 할 것1", "피해야 할 것2"]
}

상품명 작성 규칙:
- 아이템스카우트 데이터가 있으면 반드시 반영
- 경쟁 상품 수 적고 검색량 있는 세부 키워드 우선
- 브랜드명 + 상품특성 + 용도/대상 구조
- 100자 이내, 3가지 버전 제공 (공격적/중간/안전)`,
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
