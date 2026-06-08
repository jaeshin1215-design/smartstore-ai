export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

interface Brand {
  id: string;
  name: string;
  keyword: string;
  category: string;
  is_own: number;
}

interface MatrixResult {
  id: string;
  x: number;
  y: number;
  reason: string;
}

export async function POST(req: NextRequest) {
  const { brands, filterTarget } = await req.json() as {
    brands: Brand[];
    filterTarget?: string;
  };

  if (!brands || brands.length === 0) {
    return NextResponse.json({ error: "brands 필요" }, { status: 400 });
  }

  const brandList = brands.map(b =>
    `- id: "${b.id}" | 유형: ${b.is_own === 1 ? "공간이력(실증)" : "엔진후보(미접촉)"} | 카테고리: ${b.category} | 특성: ${b.keyword}`
  ).join("\n");

  const prompt = `너는 서울 서대문구 증산역 인근 복합문화공간(A·B·C 3개 동, 약 350평)의 브랜드 입점 매트릭스 배치 전문가다.

공간 특성:
- 증산역 인근 서북권 복합문화공간
- 실증 이력: 빵력장터, MOVFLEX 1유로프로젝트, 라이콘 오디션, 정책 세미나, 어린이날 행사
- 타깃 필터: D2C 직판, 팔로워 5천~2만, 오프라인 쇼룸 미보유, 서북권 밀착, 팝업 이력 보유
${filterTarget ? `- 현재 우선 카테고리: ${filterTarget}` : ""}

아래 브랜드들의 매트릭스 좌표를 계산하라.
x축(공간 적합도): 0=공간 특성과 불일치 ~ 100=완벽 일치
y축(집객력): 0=집객 약함 ~ 100=집객 강함

브랜드 목록:
${brandList}

배치 기준:
- is_own=1(공간이력): 이 공간과 실제 호흡한 검증된 브랜드 → 신뢰도 가중치 적용
- is_own=0/2(엔진후보): 특성 기반 추론 → keyword의 팝업 이력·팔로워·지역 밀착도 반영
- 카테고리별 필터 조건 충족도에 따라 x 차등화
- 인스타 인증샷 유발 가능성·지역 파급력에 따라 y 차등화

⚠️ 절대 금지: 실제 브랜드명·상호·계정명 출력 금지. reason은 특성 기반 익명 1줄만.

JSON 배열만 반환 (코드블록·설명 없이):
[{"id":"브랜드id","x":0~100,"y":0~100,"reason":"익명 1줄 근거"},...]`;

  try {
    const text = await callClaude(prompt, 600);
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const startIdx = clean.indexOf("[");
    const endIdx = clean.lastIndexOf("]");
    if (startIdx === -1 || endIdx === -1) throw new Error("배열 파싱 실패");

    const results: MatrixResult[] = JSON.parse(clean.slice(startIdx, endIdx + 1));

    // x, y를 0~100 범위로 clamp
    const clamped = results.map(r => ({
      ...r,
      x: Math.min(100, Math.max(0, Math.round(r.x))),
      y: Math.min(100, Math.max(0, Math.round(r.y))),
    }));

    return NextResponse.json({ results: clamped });
  } catch {
    return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }
}
