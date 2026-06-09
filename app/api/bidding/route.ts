export const maxDuration = 60;

import { NextRequest } from "next/server";
import { createGeminiStream } from "@/lib/claude";

const DEFAULT_MARGIN = 0.40;
const DEFAULT_CVR = 0.01;

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
1. 메인 키워드(${productName})의 estimated_cpc_range 하한은 PC CPC 실측값(${cpcData.pcCpc ?? "미확인"}원) 기준으로 산출하세요.
2. 연관 키워드의 estimated_cpc_range는 실측값 대비 경쟁도·검색량을 보정하여 추정하세요.
3. bid_command는 "'[키워드]'에 [최적입찰가]원 입찰하세요 — [기대효과]" 형식으로 작성하세요.`
    : `\n[실측 CPC 없음 — AI 추정값으로 산출]`;

  const breakEvenCpc = sellingPrice
    ? Math.round(Number(sellingPrice) * DEFAULT_MARGIN * DEFAULT_CVR)
    : null;

  const breakEvenSection = breakEvenCpc
    ? `
[손익분기 CPC 상한선 — 절대 초과 금지]
- 계산: 판매가(${sellingPrice}원) × 마진율(${DEFAULT_MARGIN * 100}%) × 전환율(${DEFAULT_CVR * 100}%) = ${breakEvenCpc}원
- 임시 기준: 마진 40%, 전환율 1% — 카테고리별 실측 데이터 확보 후 교체 예정
- 규제: 모든 키워드의 estimated_cpc_range 상한값 및 bid_command 입찰가는 ${breakEvenCpc}원을 절대 초과 불가
- 상한선 초과 예상 키워드는 recommended: false로 표시하고 경고를 reason에 포함할 것`
    : "";

  const breakEvenDisplay = breakEvenCpc ? `${breakEvenCpc}원` : "판매가 미입력";

  const prompt = `당신은 네이버 쇼핑 검색광고 전문가입니다.

상품명: ${productName}
카테고리: ${category || "미입력"}
일 광고 예산: ${dailyBudget ? dailyBudget + "원" : "미입력 (3만원 기준으로 추천)"}
판매가: ${sellingPrice ? sellingPrice + "원" : "미입력"}
${cpcSection}
${breakEvenSection}

다음 JSON 형식으로만 응답하세요:
{
  "today_action": "오늘 광고 설정에서 바로 실행할 행동 지침",
  "keywords": [
    {
      "keyword": "키워드명",
      "type": "대형/중형/소형",
      "estimated_cpc_range": "예상 CPC 범위 (예: 320~410원)",
      "break_even_limit": "${breakEvenDisplay}",
      "break_even_limit_meta": "임시 기준 (마진 40%, 전환율 1%)",
      "bid_command": "'[키워드]'에 [입찰가]원 입찰하세요 — 기대효과",
      "competition": "높음/중간/낮음",
      "recommended": true,
      "reason": "추천 근거 1줄 (예: 검색량 대비 쇼핑 경쟁 상품 수 양호)"
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
- estimated_cpc_range는 반드시 "최솟값~최댓값원" 형식으로 작성
- break_even_limit는 모든 키워드에 동일하게 "${breakEvenDisplay}" 적용`;

  return new Response(createGeminiStream(prompt, 800), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
