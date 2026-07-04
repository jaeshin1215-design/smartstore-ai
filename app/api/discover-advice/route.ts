// Discover 4축 채점 결과 → Gemini 자연어 해설 레이어
import { NextRequest } from "next/server";
import { createGeminiStream } from "@/lib/claude";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { verdict, total, reason, keyword } = await req.json() as {
    verdict: string; total: number; reason: string; keyword: string;
  };

  const verdictKo = verdict === "적극 추천" ? "진입 적극 추천"
    : verdict === "검토 필요" ? "추가 검토 필요"
    : "보류 권장";

  const prompt = `당신은 스마트스토어 셀링 전략 코치입니다. 아래 상품 분석 결과를 보고 셀러에게 다음 행동을 구체적으로 알려주세요.

키워드: ${keyword}
종합 판정: ${verdictKo} (${total}점)
판정 근거: ${reason}

작성 규칙:
- 2~3문장으로 짧게
- "왜 이 판정이 나왔는지" 1문장, "지금 당장 해야 할 것" 1~2문장
- 합쇼체, 군더더기 없이 직설적으로
- 이모지 없음`;

  return new Response(createGeminiStream(prompt, 200), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
