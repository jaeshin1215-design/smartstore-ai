import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, features, targetCustomer, price, uniquePoint } = await req.json();

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
          content: `당신은 스마트스토어 전문 마케터 겸 카피라이터입니다.
아래 상품의 모든 마케팅 콘텐츠를 한 번에 만들어주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}
주요 특징: ${features || "미입력"}
타겟 고객: ${targetCustomer || "미입력"}
판매가: ${price || "미입력"}
차별점: ${uniquePoint || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "marketing_copies": [
    { "type": "임팩트형", "copy": "짧고 강렬한 마케팅 문구 (20자 이내)", "sub": "부제 문구" },
    { "type": "공감형", "copy": "고객 감성을 건드리는 문구", "sub": "부제 문구" },
    { "type": "혜택형", "copy": "혜택과 가치를 강조하는 문구", "sub": "부제 문구" }
  ],
  "thumbnail_sets": [
    { "main": "메인 문구 (10자 이내)", "sub": "서브 문구 (15자 이내)", "badge": "뱃지 (6자 이내)" },
    { "main": "메인 문구", "sub": "서브 문구", "badge": "뱃지" },
    { "main": "메인 문구", "sub": "서브 문구", "badge": "뱃지" }
  ],
  "detail_page": {
    "hook": "첫 화면 후킹 문구 (3초 안에 고객 잡기)",
    "problem": "고객 공감 문제 상황 (2~3문장)",
    "solution": "우리 상품이 해결책인 이유 (2~3문장)",
    "features": [
      { "title": "특징 제목", "desc": "상세 설명", "image_guide": "어떤 이미지/GIF 넣으면 좋은지" }
    ],
    "trust": "신뢰 증거 문구 (인증, 수치, 후기 활용법)",
    "cta": "구매 버튼 클릭 유도 문구",
    "urgency": "긴급성/희소성 문구",
    "faq": [
      { "q": "자주 묻는 질문", "a": "답변" }
    ]
  },
  "blog_post": {
    "title": "네이버 블로그 SEO 최적화 제목",
    "intro": "블로그 도입부 (독자 관심 유도, 3~4문장)",
    "body": "본문 내용 (상품 소개, 특징, 사용법, 300~400자)",
    "outro": "마무리 + 구매 유도 문구",
    "tags": ["블로그 태그1", "태그2", "태그3", "태그4", "태그5"]
  },
  "instagram": {
    "caption": "인스타그램 캡션 (이모지 포함, 150자 이내)",
    "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"],
    "story_text": "인스타 스토리용 짧은 문구"
  },
  "kakao": {
    "channel_post": "카카오채널 포스팅 문구 (친근한 톤, 100자 이내)",
    "talk_message": "카카오톡 친구에게 공유할 메시지"
  },
  "canva_guide": {
    "thumbnail_style": "Canva에서 만들 썸네일 스타일 가이드",
    "color_scheme": "추천 색상 조합",
    "font_suggestion": "추천 폰트 스타일",
    "layout_tip": "레이아웃 팁"
  }
}`,
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
