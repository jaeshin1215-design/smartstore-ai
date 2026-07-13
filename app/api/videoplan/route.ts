export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { productName, category, features, targetCustomer, price, uniquePoint, productImageB64, productImageMime } = await req.json();

  if (!productName) {
    return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 500 });
  }

  const hasPhoto = !!(productImageB64 && productImageMime);

  const prompt = `당신은 스마트스토어 커머스 영상 기획 전문가입니다. Google Flow (Veo 3.1 Quality 모델)를 활용한 AI 영상 기획안을 작성해주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}
주요 특징: ${features || "미입력"}
타겟 고객: ${targetCustomer || "미입력"}
판매가: ${price || "미입력"}
차별점: ${uniquePoint || "미입력"}
${hasPhoto ? "실물 제품사진: 첨부됨 (위 이미지 참고)" : "실물 제품사진: 미첨부"}

허위광고 위험도 기준 (반드시 준수):
- "안전": 배경/분위기 영상, SNS훅 1~3초, 실물 제품 없는 감성 씬, 라이프스타일 컨텍스트
- "검수필수": 제품 회전, 클로즈업, 제품 색상/모양 강조, 사용 장면 (실물과 다를 수 있음)
- "위험": 로고, 텍스트 오버레이, 제품 성능 수치 시각화, 인증마크 표현
${hasPhoto ? "\n실물 제품사진이 첨부되었습니다. 각 씬에 대해 첨부 사진의 실제 색상·형태를 기준으로 risk_level을 재판정하고, photo_note 필드에 대조 결과를 1줄로 작성하세요." : ""}

Veo 3.1 설정:
- model: "Quality" 고정 (커머스 추천, 왜곡 적음)
- duration: 4/6/8/10초 중 선택
- camera_move: Dolly in / Dolly out / Orbit / Static / Zoom in / Zoom out / Pan left / Pan right
- 비율: 씬 목적에 맞게 9:16(쇼츠/릴스) 또는 16:9(유튜브) 명시

규칙:
- 첫 번째 씬(order:1)은 반드시 "안전" 등급: 배경만 바꾼 감성 영상, 4초, 텍스트 없음, 실제 제품 등장 없는 분위기 연출
- 씬 5~7개 구성, 다양한 목적(감성/제품소개/기능강조/라이프스타일/구매유도)과 위험도 혼합
- flow_prompt는 영문으로, Google Flow에 바로 붙여넣기 가능한 구체적 프롬프트

다음 JSON 스키마로만 응답하세요:
{
  "strategy": "전체 영상 캠페인 전략 한 줄 (한국어)",
  "photo_verified": ${hasPhoto ? "true" : "false"},
  "scenes": [
    {
      "order": 1,
      "purpose": "씬 목적 (한국어, 예: 브랜드 감성 도입)",
      "duration": 4,
      "model": "Quality",
      "camera_move": "Dolly in",
      "risk_level": "안전",
      "risk_reason": "실제 제품 미등장, 배경 분위기만 표현 (한국어)",
      "photo_note": ${hasPhoto ? '"실물사진 기준 대조 결과 한 줄 (예: 업로드 사진과 색상·형태 일치 — 위험도 안전 유지)"' : "null"},
      "flow_prompt": "Cinematic lifestyle scene, warm morning light filtering through sheer curtains, cozy home interior, soft bokeh background, no product visible, emotional atmosphere, 9:16 vertical, 4 seconds, no text"
    }
  ],
  "safety_note": "제품 정확도 원칙 한 줄 (한국어, 예: 상세페이지 메인 제품 컷은 반드시 실물 사진 유지)"
}`;

  // Gemini parts: 이미지 있으면 inlineData 먼저, 텍스트 프롬프트 뒤에
  const parts: object[] = [];
  if (hasPhoto) {
    parts.push({ inlineData: { mimeType: productImageMime, data: productImageB64 } });
  }
  parts.push({ text: prompt });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { error?: { message?: string } }).error?.message ?? "Gemini 호출 실패" },
      { status: 500 }
    );
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json({ result: parsed });
  } catch {
    return NextResponse.json({ error: "결과 파싱 실패" }, { status: 500 });
  }
}
