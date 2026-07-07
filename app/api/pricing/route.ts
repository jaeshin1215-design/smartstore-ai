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

  // ── 서버 확정 계산 — LLM은 이 숫자를 절대 재계산하지 않음 ──
  const margin = targetMargin ? Number(targetMargin) : 32;
  const recommended_price = Math.round(totalCost / (1 - margin / 100));

  // min_price: 최소마진 15%. 경쟁가 있으면 경쟁가*0.95 캡 적용, 단 원가+500원 바닥 보장
  const minByMargin = Math.round(totalCost / (1 - 0.15));
  const competitor = competitorPrice ? Number(competitorPrice) : null;
  const min_price = competitor
    ? Math.max(totalCost + 500, Math.min(minByMargin, Math.round(competitor * 0.95)))
    : minByMargin;

  // max_price: 최대마진 45%
  const max_price = Math.round(totalCost / (1 - 0.45));

  const margin_rate = Math.round(((recommended_price - totalCost) / recommended_price) * 100);
  const profit = recommended_price - totalCost;
  const price_breakdown = { cost: totalCost, profit, margin_per_unit: profit };

  const prompt = `당신은 네이버 스마트스토어 가격 전략 전문가입니다.

아래 수치는 서버에서 수식으로 이미 확정 계산된 값입니다. 이 숫자들을 절대 재계산하거나 수정하지 마세요.

[확정된 가격 데이터]
- 총 원가: ${totalCost.toLocaleString()}원 (매입가 ${price.toLocaleString()} + 배송 ${shipping.toLocaleString()} + 수수료 ${platformFee.toLocaleString()} / ${totalFeeRate}% ${feeLabel})
- 추천 판매가: ${recommended_price.toLocaleString()}원 (마진 ${margin}%)
- 최소 판매가: ${min_price.toLocaleString()}원 (최소마진 15%${competitor ? ` / 경쟁가 ${competitor.toLocaleString()}원 기준 캡 적용` : ""})
- 최대 판매가: ${max_price.toLocaleString()}원 (최대마진 45%)
- 마진율: ${margin_rate}%
- 건당 이익: ${profit.toLocaleString()}원

[상품 정보]
- 상품명: ${productName}
- 경쟁사 최저가: ${competitorPrice ? competitorPrice + "원" : "미입력"}
- 카테고리: ${category || "미입력"}
- 상품 특징: ${features || "미입력"}

위 확정 수치를 그대로 사용하여 다음 JSON 형식으로만 응답하세요.
숫자 필드는 위에 명시된 값을 그대로 복사하세요:
{
  "action_command": "지금 바로 판매가를 ${recommended_price.toLocaleString()}원으로 설정하세요. [이유 1~2문장]",
  "recommended_price": ${recommended_price},
  "min_price": ${min_price},
  "max_price": ${max_price},
  "margin_rate": ${margin_rate},
  "price_breakdown": { "cost": ${price_breakdown.cost}, "profit": ${price_breakdown.profit}, "margin_per_unit": ${price_breakdown.margin_per_unit} },
  "strategy": "이 가격 구간이 적절한 이유와 경쟁 환경 고려 전략 (3~4문장)",
  "tips": ["오늘 바로 실행할 것 1가지", "이번 주 점검할 것 1가지", "다음 달 재검토할 것 1가지"]
}`;

  return new Response(createGeminiStream(prompt, 600), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
