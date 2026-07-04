// 채널적합 LLM 폴백 — regex 미스 카테고리 전용
import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { keyword } = await req.json() as { keyword: string };
  if (!keyword) return NextResponse.json({ error: "keyword 필요" }, { status: 400 });

  const prompt = `한국 스마트스토어에서 아래 키워드 상품을 판매하기에 얼마나 적합한지 평가해주세요.

키워드: ${keyword}

평가 기준:
- 90-100: 최우수 (뷰티·생활용품 등 스마트스토어 베스트 카테고리)
- 70-89: 우수 (시즌 수요 명확, 재구매율 높음)
- 50-69: 보통 (일반 상품, 특별한 제약 없음)
- 30-49: 주의 (반품률 높거나 이미지 품질 중요)
- 0-29: 부적합 (신선식품·의료기기·규제 품목)

JSON만 반환 (다른 텍스트 없음):
{"score": 정수, "label": "우수" 또는 "보통" 또는 "주의", "evidence": "한 줄 근거 (40자 이내)"}`;

  try {
    const raw = await callGemini(prompt, 100);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { score: number; label: string; evidence: string };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ score: 55, label: "보통", evidence: "AI 분류 실패 — 기본값 적용" });
  }
}
