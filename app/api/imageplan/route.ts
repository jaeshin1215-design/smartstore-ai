export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

// 화분 전용 프롬프트 템플릿 (2026-07-13 강희원 차장 건 — Google Flow 실증 검증 문구)
// ⚠️ Gemini 생성 금지: 검증된 골격이 한 글자도 바뀌지 않도록 코드 레벨 고정.
//    상품명만 치환한다. 리본·나무받침 등 소품 제외 확정.
const POT_KEYWORD_RE = /화분|플랜테리어|화기|플랜트/;

const MOOD_CUT_TEMPLATE = (productName: string) =>
  `A minimalist, softly lit interior wall corner with warm natural light falling on the ${productName}, creating a natural shadow on the wall behind it. Light wood or neutral flooring. No props, no people, no furniture — the plant is the sole subject.
Critical — scale accuracy: preserve the original product's exact proportions and form. No deformation to the central object.`;

const CAFE_CUT_TEMPLATE = (productName: string) =>
  `A minimalist café interior corner, generous open space around the ${productName} — not cramped between furniture or shelving. Clean, neutral beige or cream walls with minimal texture, no busy wood shelving or cluttered objects near the plant.
The plant sits directly on the floor, positioned near a glass door or architectural corner (not in the middle of an open walkway), with enough breathing room on both sides that it reads as intentionally placed, not squeezed in.
Warm natural sunlight falls directly on the plant, making it the brightest, most saturated, most in-focus element in the frame. Background elements (café counter, subtle signage, 0-2 people) are softly out of focus (shallow depth of field, f/1.8-2.8 bokeh) and lower in brightness than the plant.
Critical — scale accuracy: the plant (including pot) is approximately 90-100cm tall in reality. Use the door (standard height ~200cm) and counter (standard height ~90-100cm) as physical scale references — the pot should sit roughly at counter height, and the foliage top should reach roughly mid-door height. Preserve the original product's exact proportions and form. No deformation to the central object, no shrinking relative to the scene.`;

export async function POST(req: NextRequest) {
  const { productName, category, features, targetCustomer, price, uniquePoint } = await req.json();

  if (!productName) {
    return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 500 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;

  const prompt = `당신은 스마트스토어 상세페이지 전문 기획자입니다. 대형 이커머스(쿠팡, 스마트스토어 상위권)의 상세페이지 이미지 전략을 분석하고, 이 상품이 경쟁사보다 훨씬 뛰어난 상세페이지를 만들 수 있도록 이미지 기획안을 작성해주세요.

현재 월: ${month}월
상품명: ${productName}
카테고리: ${category || "미입력"}
주요 특징: ${features || "미입력"}
타겟 고객: ${targetCustomer || "미입력"}
판매가: ${price || "미입력"}
차별점: ${uniquePoint || "미입력"}

다음 JSON 스키마를 엄격히 따라 응답하세요. 각 이미지는 실제 촬영 또는 제작 가능한 수준으로 구체적으로 작성하세요:
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
          "ai_prompt": "AI 이미지 생성용 영문 프롬프트 - Midjourney/DALL-E 스타일로 구체적이고 상세하게"
        }
      ]
    }
  ],
  "total_images": 0,
  "shooting_tips": ["촬영 팁 1", "촬영 팁 2", "촬영 팁 3"]
}

섹션은 다음 순서로 구성하세요:
1. 첫 화면 Hero (3초 안에 고객 잡기)
2. 고객 공감 문제 제기
3. 핵심 특징 1~3개 (각 특징당 1~2장)
4. 원산지/성분/인증 신뢰 증거
5. 사용 전/후 또는 비교 이미지
6. 사용법/활용 라이프스타일
7. 패키지/용량 상세
8. 구매 유도 CTA`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { error?: { message?: string } }).error?.message ?? "Gemini 호출 실패" },
      { status: 500 }
    );
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text);
    // 화분 감지: 상품명+카테고리+주요특징 합산 검사 (category는 선택 필드라 단독 판정 금지)
    const isPot = POT_KEYWORD_RE.test([productName, category, features].filter(Boolean).join(" "));
    if (isPot) {
      parsed.pot_prompts = {
        mood_cut: { title: "무드컷", prompt: MOOD_CUT_TEMPLATE(productName) },
        cafe_cut: { title: "카페컷", prompt: CAFE_CUT_TEMPLATE(productName) },
      };
    }
    return NextResponse.json({ result: parsed });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
