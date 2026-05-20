export const maxDuration = 60;

import { NextRequest } from "next/server";
import { createGeminiStream } from "@/lib/claude";

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
7. 200~300자, 합쇼체, 이모지 1개만`;

  return new Response(createGeminiStream(prompt, 400), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
