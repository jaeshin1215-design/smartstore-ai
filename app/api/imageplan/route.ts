import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, features, targetCustomer, price, uniquePoint, competitorUrl } = await req.json();

  if (!productName) {
    return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;

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
          content: `당신은 스마트스토어 상세페이지 전문 기획자입니다. 대형 이커머스(쿠팡, 스마트스토어 상위권)의 상세페이지 이미지 전략을 분석하고, 이 상품이 경쟁사보다 훨씬 뛰어난 상세페이지를 만들 수 있도록 이미지 기획안을 작성해주세요.

현재 월: ${month}월

상품명: ${productName}
카테고리: ${category || "미입력"}
주요 특징: ${features || "미입력"}
타겟 고객: ${targetCustomer || "미입력"}
판매가: ${price || "미입력"}
차별점: ${uniquePoint || "미입력"}
참고 경쟁사 URL: ${competitorUrl || "없음"}

다음 JSON 형식으로만 응답하세요. 각 이미지는 실제 촬영 또는 제작 가능한 수준으로 구체적으로 작성하세요:
{
  "strategy": "이 상품 상세페이지의 전체 이미지 전략 한 줄 요약",
  "competitor_weakness": "경쟁사 상세페이지의 일반적인 약점 (이 카테고리 기준)",
  "sections": [
    {
      "order": 1,
      "name": "섹션 이름 (예: 첫 화면 Hero)",
      "purpose": "이 섹션의 목적",
      "images": [
        {
          "index": 1,
          "type": "이미지 종류 (예: 제품 정면샷, 라이프스타일, 성분 클로즈업 등)",
          "description": "이미지 상세 설명 - 무엇을 어떻게 찍어야 하는지 구체적으로",
          "angle": "촬영 각도 (예: 정면 45도, 하이앵글, 클로즈업 등)",
          "background": "배경 색/소재/장소",
          "props": "함께 배치할 소품/연출 요소",
          "text_overlay": "이미지에 넣을 텍스트 문구 (없으면 빈 문자열)",
          "why_better": "이 방식이 경쟁사보다 나은 이유",
          "ai_prompt": "AI 이미지 생성용 영문 프롬프트 - Midjourney/DALL-E 스타일로 구체적이고 상세하게. 예: professional product photography of organic aronia powder in white ceramic bowl, dark purple berries scattered around, white background, soft studio lighting, 8k resolution, high detail, commercial photography"
        }
      ]
    }
  ],
  "total_images": 전체 이미지 수(숫자),
  "shooting_tips": [
    "촬영 팁 1 (스마트폰으로도 가능한 실용적인 팁)",
    "촬영 팁 2",
    "촬영 팁 3"
  ],
  "mobile_optimization": [
    "모바일 최적화 팁 1",
    "모바일 최적화 팁 2"
  ],
  "free_tools": [
    { "tool": "도구명", "purpose": "용도", "url_hint": "검색 키워드" }
  ]
}

섹션은 다음 순서로 구성하세요:
1. 첫 화면 Hero (3초 안에 고객 잡기)
2. 고객 공감 문제 제기
3. 핵심 특징 1~3개 (각 특징당 1~2장)
4. 원산지/성분/인증 신뢰 증거
5. 사용 전/후 또는 비교 이미지
6. 사용법/활용 라이프스타일
7. 패키지/용량 상세
8. 구매 유도 CTA`,
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
    return NextResponse.json({ error: "결과 파싱 실패", raw: text }, { status: 500 });
  }
}
