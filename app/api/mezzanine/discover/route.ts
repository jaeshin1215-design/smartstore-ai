export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

interface CategoryInput {
  id: string;
  label: string;
}

export async function POST(req: NextRequest) {
  const { categories } = await req.json() as { categories: CategoryInput[] };

  if (!categories || categories.length === 0) {
    return NextResponse.json({ error: "categories 필요" }, { status: 400 });
  }

  const catList = categories.map(c => `- id: "${c.id}" | 카테고리명: ${c.label}`).join("\n");

  const prompt = `너는 서울 서대문구 증산역 인근 복합문화공간(A·B·C 3개 동, 약 350평)의 브랜드 카테고리 적합성 분석 전문가다.

공간 특성:
- 증산역 인근 서북권 복합문화공간, 통창·개방감이 큰 A동 특성
- 실증 이력: 빵력장터, MOVFLEX 1유로프로젝트, 라이콘 오디션, 정책 세미나, 어린이날 행사
- 타깃 필터: D2C 직판, 팔로워 5천~2만, 오프라인 쇼룸 미보유, 서북권 밀착, 팝업 이력 보유
- 증산역 일 승하차 약 1.2만 (서북권 중위권 — 유동인구 약점 존재)

분석 대상 카테고리:
${catList}

각 카테고리에 대해 이 공간 기준 적합성을 분석하라.

반환 필드:
- description: 이 공간 기준 이 카테고리가 왜 발굴됐는지 2~3문장 (익명, 외부 시장 수치 금지)
- tags: 이 공간 기준 핵심 특성 3개 문자열 배열
- matchRate: 이 공간에 적합한 정도 0~100 정수 (카테고리 간 차등 필수 — 최대값과 최솟값 차이 20점 이상)
- why: 이 공간의 어떤 DNA가 이 카테고리를 발굴했는지 1줄 (공간 특성 → 카테고리 연결고리)
- risk: 이 카테고리를 수용할 때 공간의 물리적·구조적 단점 1줄 (정직하게, 부드럽게 안 꾸밀 것)

⚠️ 절대 금지: 실제 브랜드명·계정명·상호 출력
⚠️ 절대 금지: "전국 1위", "시장 점유율", 외부 데이터 기반 시장 수치 주장
⚠️ matchRate: 카테고리 간 반드시 차등화. 동일 값 2개 이상 금지. 최고점과 최저점 차이 20점 이상 유지.

JSON 객체만 반환 (코드블록·설명 없이, id를 키로):
{"카테고리id":{"description":"...","tags":["...","...","..."],"matchRate":0~100,"why":"...","risk":"..."},...}`;

  try {
    const text = await callClaude(prompt, 900);
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) throw new Error("객체 파싱 실패");

    const result = JSON.parse(clean.slice(startIdx, endIdx + 1));
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }
}
