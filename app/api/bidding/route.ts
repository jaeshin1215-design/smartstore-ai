export const maxDuration = 60;

import { NextRequest } from "next/server";
import { createGeminiStream } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { productName, category, dailyBudget, sellingPrice, cpcData } = await req.json();
  if (!productName) return new Response("상품명을 입력해주세요.", { status: 400 });

  const cpcSection = cpcData
    ? `
[네이버 SearchAd 실측 데이터 — 반드시 반영하여 제안값을 산출하세요]
- 월 검색량: ${cpcData.monthlySearch?.toLocaleString()}회
- PC CPC 실측값: ${cpcData.pcCpc !== null ? cpcData.pcCpc + "원" : "없음"}
- 모바일 CPC 실측값: ${cpcData.mobileCpc !== null ? cpcData.mobileCpc + "원" : "없음"}
- 경쟁도 지수: ${cpcData.competition !== null ? cpcData.competition : "없음"}

지침:
1. 메인 키워드(${productName})의 estimated_cpc는 PC CPC 실측값(${cpcData.pcCpc ?? "미확인"}원)을 그대로 사용하세요.
2. bid_amount는 estimated_cpc보다 낮되, 해당 키워드의 노출 순위를 유지할 수 있는 최저 입찰가를 찾아 제안하세요.
3. bid_command는 "실측 ${cpcData.pcCpc ?? "N"}원에서 [bid_amount]원으로 낮춰도 [이유로 인해 노출 유지 가능]" 형식으로 작성하세요.`
    : `\n[실측 CPC 없음 — AI 추정값으로 산출]`;

  const prompt = `당신은 네이버 쇼핑 검색광고 전문가입니다.

상품명: ${productName}
카테고리: ${category || "미입력"}
일 광고 예산: ${dailyBudget ? dailyBudget + "원" : "미입력 (3만원 기준으로 추천)"}
판매가: ${sellingPrice ? sellingPrice + "원" : "미입력"}
${cpcSection}

다음 JSON 형식으로만 응답하세요:
{
  "today_action": "오늘 광고 설정에서 할 일",
  "keywords": [
    {
      "keyword": "키워드",
      "type": "대형/중형/소형",
      "estimated_cpc": "예상 CPC(숫자만, 메인 키워드는 실측값 사용)",
      "bid_amount": "권장 입찰가(숫자만, estimated_cpc보다 낮게)",
      "bid_command": "실측/추정 [N]원에서 [bid_amount]원으로 낮춰도 [이유] 형식의 실행 지침",
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
- bid_amount는 노출 유지 최저선 기준 (estimated_cpc의 55~80% 수준)`;

  return new Response(createGeminiStream(prompt, 800), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
