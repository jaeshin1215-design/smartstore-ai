export const maxDuration = 60;

import { NextRequest } from "next/server";
import { createGeminiStream } from "@/lib/claude";

const GRADE_RATES: Record<string, number> = {
  micro: 0.0198,
  small1: 0.02585,
  small2: 0.0275,
  small3: 0.03025,
  normal: 0.0363,
};

const TRAFFIC_RATES: Record<string, number> = {
  naver_shopping: 0.0273,
  external: 0.0091,
};

const GRADE_LABELS: Record<string, string> = {
  micro: "영세 (3억 미만)",
  small1: "중소1 (3~5억)",
  small2: "중소2 (5~10억)",
  small3: "중소3 (10~30억)",
  normal: "일반 (30억+)",
};

const TRAFFIC_LABELS: Record<string, string> = {
  naver_shopping: "네이버 쇼핑 유입",
  external: "외부 마케팅/직접 유입",
};

export async function POST(req: NextRequest) {
  const {
    productName,
    purchasePrice,
    shippingCost,
    competitorPrice,
    targetMargin,
    category,
    features,
    salesGrade,
    trafficSource,
    customFeeRate,
  } = await req.json();

  if (!productName || !purchasePrice)
    return new Response("필수 입력값이 없습니다.", { status: 400 });

  const shipping = Number(shippingCost) || 3000;
  const price = Number(purchasePrice);

  let feeRate: number;
  let feeLabel: string;

  if (customFeeRate !== undefined && customFeeRate !== null && customFeeRate !== "") {
    feeRate = Number(customFeeRate) / 100;
    feeLabel = `직접 입력 ${customFeeRate}%`;
  } else {
    const grade = salesGrade || "small3";
    const traffic = trafficSource || "naver_shopping";
    const gradeRate = GRADE_RATES[grade] ?? 0.03025;
    const trafficRate = TRAFFIC_RATES[traffic] ?? 0.0273;
    feeRate = gradeRate + trafficRate;
    const gradePct = (gradeRate * 100).toFixed(3).replace(/\.?0+$/, "");
    const trafficPct = (trafficRate * 100).toFixed(2);
    feeLabel = `${GRADE_LABELS[grade] ?? grade} ${gradePct}% + ${TRAFFIC_LABELS[traffic] ?? traffic} ${trafficPct}%`;
  }

  const platformFee = Math.round(price * feeRate);
  const totalFeeRate = (feeRate * 100).toFixed(3).replace(/\.?0+$/, "");
  const totalCost = price + shipping + platformFee;

  const prompt = `당신은 네이버 스마트스토어 가격 전략 전문가입니다.

상품명: ${productName}
현재 매입가(원가): ${purchasePrice}원
배송비: ${shipping}원
스마트스토어 수수료(${totalFeeRate}% / ${feeLabel}): ${platformFee}원
총 원가 합계: ${totalCost}원
경쟁사 최저가: ${competitorPrice ? competitorPrice + "원" : "미입력"}
목표 마진율: ${targetMargin ? targetMargin + "%" : "미입력"}
카테고리: ${category || "미입력"}
상품 특징: ${features || "미입력"}

다음 JSON 형식으로만 응답하세요:
{
  "action_command": "지금 바로 판매가를 [N]원으로 설정하세요. [이유]",
  "recommended_price": 추천판매가(숫자만),
  "min_price": 최소판매가(숫자만),
  "max_price": 최대판매가(숫자만),
  "margin_rate": 마진율(숫자만),
  "price_breakdown": { "cost": ${totalCost}, "profit": 이익(숫자만), "margin_per_unit": 건당순이익(숫자만) },
  "strategy": "가격 전략 설명",
  "tips": ["오늘 바로 할 것","이번 주","다음 달"]
}
- 총 원가 ${totalCost}원 기준으로 모든 가격 계산
- 목표 마진율 없으면 30~35% 권장`;

  return new Response(createGeminiStream(prompt, 600), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
