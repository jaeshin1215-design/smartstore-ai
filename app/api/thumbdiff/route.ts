import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, currentStyle } = await req.json();

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
          content: `당신은 네이버 쇼핑 썸네일 클릭률(CTR) 전문가입니다.
해당 카테고리의 경쟁사 썸네일 패턴을 분석하고 차별화 전략을 제안해주세요.

상품명: ${productName}
카테고리: ${category}
현재 썸네일 스타일: ${currentStyle || "흰색 배경 + 상품 정면"}

다음 JSON 형식으로만 응답하세요:
{
  "competitor_pattern": {
    "background": "경쟁사들이 주로 쓰는 배경 설명",
    "composition": "경쟁사들의 구도 패턴",
    "text_usage": "경쟁사들의 텍스트 사용 방식",
    "weakness": "경쟁사 썸네일의 공통 약점"
  },
  "differentiation": {
    "background_tip": "차별화된 배경 추천 (경쟁사와 겹치지 않는)",
    "composition_tip": "차별화된 구도 추천",
    "color_palette": ["추천 색상1", "색상2", "색상3"],
    "text_tip": "텍스트 배치 전략"
  },
  "click_hooks": [
    {
      "element": "클릭률 높이는 요소",
      "how": "구체적인 적용 방법",
      "effect": "예상 효과"
    }
  ],
  "ab_test": {
    "version_a": "A안 설명 (안전한 선택)",
    "version_b": "B안 설명 (차별화 도전)",
    "recommendation": "어느 버전부터 시작할지 추천"
  },
  "mobile_tips": ["모바일 화면 최적화 팁1", "팁2"],
  "ctr_checklist": ["CTR 체크리스트 항목1", "항목2", "항목3", "항목4"]
}

분석 기준:
- 네이버 쇼핑에서 클릭률을 높이는 핵심은 '튀는 것'
- 모바일 기준 썸네일 크기: 160x160px
- 경쟁사가 흰 배경이면 컬러 배경으로 차별화
- 텍스트는 3~5단어 이내, 굵은 폰트
- 카테고리별 고성과 썸네일 패턴 반영`,
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
