import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, targetCustomer, problem, features } = await req.json();

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
          content: `당신은 네이버 스마트스토어 구매 전환율 전문가입니다.
고객이 이탈하지 않고 결제까지 이어지는 스토리텔링형 상세페이지 구성을 만들어주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}
타겟 고객: ${targetCustomer || "미입력"}
고객의 문제/불편함: ${problem || "미입력"}
상품 특징: ${features || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "hook": "첫 3초 안에 고객을 잡는 후킹 문구 (20자 이내)",
  "problem": "고객이 공감하는 문제 상황 묘사 (2~3문장)",
  "solution": "우리 상품이 해결책인 이유 (2~3문장)",
  "evidence": "신뢰를 주는 증거 (인증, 수치, 후기 활용법)",
  "sections": [
    {
      "title": "섹션 제목",
      "content": "섹션 내용",
      "tip": "이미지/영상 활용 팁"
    }
  ],
  "cta": "구매 버튼 클릭을 유도하는 마지막 문구",
  "urgency": "긴급성/희소성 표현 문구 (예: 오늘만 이 가격)",
  "faq": [
    {"question": "자주 묻는 질문", "answer": "답변"}
  ]
}

스마트스토어 상세페이지 구성 원칙:
- 문제 공감 → 해결책 제시 → 증거 → 행동 유도 순서
- 모바일 기준 스크롤 5번 이내로 핵심 전달
- 네이버 쇼핑 알고리즘: 체류 시간이 길수록 노출 유리
- 구매 전환율 높이는 심리적 트리거 활용`,
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
