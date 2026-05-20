export const maxDuration = 60;

import { NextRequest } from "next/server";
import { createGeminiStream } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { productName, category, dailyBudget, sellingPrice } = await req.json();
  if (!productName) return new Response("상품명을 입력해주세요.", { status: 400 });

  const prompt = `당신은 네이버 쇼핑 검색광고 전문가입니다.

상품명: ${productName}
카테고리: ${category || "미입력"}
일 광고 예산: ${dailyBudget ? dailyBudget + "원" : "미입력 (3만원 기준으로 추천)"}
판매가: ${sellingPrice ? sellingPrice + "원" : "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "today_action": "오늘 광고 설정에서 할 일",
  "keywords": [
    {
      "keyword": "키워드",
      "type": "대형/중형/소형",
      "estimated_cpc": "예상 CPC(숫자만)",
      "bid_amount": "권장 입찰가(숫자만)",
      "bid_command": "'[키워드]'에 [입찰가]원 입찰하세요 — 기대효과",
      "competition": "높음/중간/낮음",
      "recommended": true,
      "reason": "추천 이유"
    }
  ],
  "strategy": {
    "phase1": "1~2주차 전략",
    "phase2": "3~4주차 전략",
    "phase3": "2개월+ 전략"
  },
  "budget_allocation": {
    "small_keywords": "소형 비율(숫자만)",
    "medium_keywords": "중형 비율(숫자만)",
    "reason": "배분 이유"
  },
  "roi_estimate": "예상 ROI 설명",
  "tips": ["팁1","팁2","팁3"]
}
- 소형 키워드 5개 이상, 중형 1~2개 포함
- bid_amount는 estimated_cpc의 80~90% 수준`;

  return new Response(createGeminiStream(prompt, 800), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
