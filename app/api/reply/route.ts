export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { inquiry } = await req.json();
  if (!inquiry) return new Response("문의 내용을 입력해주세요.", { status: 400 });

  const prompt = `당신은 스마트스토어 고객 응대 전문가입니다.
고객 문의를 분석하고, 셀러가 바로 복사·붙여넣기할 수 있는 완성형 답변을 작성해주세요.

고객 문의:
${inquiry}

답변 작성 규칙:
1. 문의 유형 파악: 배송지연 / 교환반품 / 상품문의 / 결제오류 / 기타 중 해당 유형에 맞게 작성
2. 첫 문장: 고객 불편에 진심으로 공감 (단, 과도하게 사과하지 않음)
3. 본문: 구체적 해결 액션을 단계별로 안내
4. 배송 지연이면 → 현재 상황 인정 + 처리 예정일 안내 + 보상 제안 포함
5. 교환/반품이면 → 접수 방법 3단계 이내로 명확히 안내
6. 마지막 문장: 추가 문의 환영 + [셀러명] 자리 표시
7. 200~300자, 합쇼체, 이모지 1개만

긴급도 판단:
- "긴급": 마감시한 표현("오늘까지", "내일", "내일 행사", "지금 당장", "당일", "오늘 저녁" 등) 포함 시
- "보통": 위 표현 없으면 보통

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 금지:
{
  "urgency": "긴급" 또는 "보통",
  "reply": "완성형 고객 답변 텍스트"
}`;

  try {
    const text = await callGemini(prompt, 600);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const data = JSON.parse(match[0]) as { urgency?: string; reply?: string };
    return NextResponse.json({ urgency: data.urgency || "보통", reply: data.reply || "" });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
