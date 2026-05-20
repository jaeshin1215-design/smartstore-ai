import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { category, subCategory, keywords, manualData } = await req.json();

  if (!category) {
    return NextResponse.json({ error: "카테고리를 입력해주세요." }, { status: 400 });
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const dateStr = `${today.getFullYear()}년 ${month}월`;

  const season =
    month >= 3 && month <= 5 ? "봄" :
    month >= 6 && month <= 8 ? "여름" :
    month >= 9 && month <= 11 ? "가을" : "겨울";

  const upcomingEvents: string[] = [];
  if (month === 1) upcomingEvents.push("설날, 발렌타인데이 시즌");
  if (month === 2) upcomingEvents.push("화이트데이, 졸업/입학 시즌");
  if (month === 3) upcomingEvents.push("봄맞이, 개학 시즌");
  if (month === 4) upcomingEvents.push("봄 여행, 어버이날 준비");
  if (month === 5) upcomingEvents.push("어버이날, 스승의날, 어린이날");
  if (month === 6) upcomingEvents.push("여름 준비, 무더위 시즌");
  if (month === 7) upcomingEvents.push("여름 휴가, 장마 시즌");
  if (month === 8) upcomingEvents.push("여름 마무리, 개학 준비");
  if (month === 9) upcomingEvents.push("추석, 가을 시즌");
  if (month === 10) upcomingEvents.push("핼러윈, 가을 여행");
  if (month === 11) upcomingEvents.push("수능, 빼빼로데이, 블랙프라이데이");
  if (month === 12) upcomingEvents.push("크리스마스, 연말 선물");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `당신은 네이버 스마트스토어 트렌드 분석 전문가입니다.
${dateStr} 기준 ${season} 시즌의 트렌드를 분석하여 셀러에게 실용적인 리포트를 제공해주세요.

분석 카테고리: ${category}
세부 카테고리: ${subCategory || "전체"}
관심 키워드: ${keywords || "미입력"}
현재 시즌: ${season}
주요 이벤트: ${upcomingEvents.join(", ")}
추가 데이터: ${manualData || "없음"}

다음 JSON 형식으로만 응답하세요:
{
  "summary": "이번 달 트렌드 한줄 요약",
  "trend_keywords": [
    {
      "keyword": "급상승 키워드",
      "reason": "상승 이유",
      "competition": "높음/중간/낮음",
      "opportunity": "셀러 기회 점수 (1~10)",
      "action": "지금 바로 할 수 있는 액션"
    }
  ],
  "hot_products": [
    {
      "product": "주목할 상품",
      "why_now": "지금 팔아야 하는 이유",
      "target": "타겟 고객",
      "price_range": "예상 가격대"
    }
  ],
  "season_strategy": {
    "this_month": "이번 달 집중 전략",
    "next_month": "다음 달 준비 전략",
    "avoid": "이번 달 피해야 할 것"
  },
  "event_opportunities": [
    {
      "event": "이벤트/기념일",
      "product_idea": "연관 상품 아이디어",
      "timing": "언제부터 준비해야 하는지",
      "copy": "이벤트 문구 예시"
    }
  ],
  "competitor_alert": "경쟁사 주의 사항",
  "action_checklist": ["지금 당장 해야 할 것1", "해야 할 것2", "해야 할 것3"]
}

분석 기준:
- ${dateStr} 현재 기준 네이버 쇼핑 트렌드
- ${season} 시즌 소비 패턴
- 스마트스토어 상위 노출 알고리즘 특성
- 기회 점수: 검색량 대비 경쟁이 적은 키워드일수록 높음`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({
      result: parsed,
      meta: { date: dateStr, season, events: upcomingEvents }
    });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
