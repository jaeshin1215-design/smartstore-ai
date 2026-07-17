export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { productName, category, matrixX, matrixY, decision, mode, price, purchasePrice } = await req.json();
  if (!productName) return NextResponse.json({ error: "브랜드/상품명 필요" }, { status: 400 });

  const x = matrixX ?? 50;
  const y = matrixY ?? 50;

  let prompt: string;

  if (mode === "mezzanine") {
    const quadrant =
      x >= 50 && y >= 50 ? "Prime Picks (공간 적합도↑ × 집객력↑ — 즉시 입점 후보)" :
      x < 50  && y >= 50 ? "Crowd Pullers (공간 적합도↓ × 집객력↑ — 집객 앵커 역할)" :
      x < 50  && y < 50  ? "Wild Card (공간 적합도↓ × 집객력↓ — 검증 필요)" :
                           "Curated Gems (공간 적합도↑ × 집객력↓ — 큐레이션 차별화)";

    prompt = `당신은 서울 서대문구 증산역 인근 복합문화공간 메자닌 북가좌의 브랜드 입점 제안서 작성 전문가입니다.
아래 브랜드 정보를 바탕으로 입점 제안 초안을 생성하세요.
이 초안은 담당자가 현장 감각으로 다듬을 초안입니다. 완성본이 아닙니다.
실증 자료 없는 수치 주장은 쓰지 말고, 필요하면 needs_evidence: true를 달아주세요.

⚠️ 중요 제약:
- "홍대 인근" 사용 금지 → 반드시 "서대문구 증산역 인근" 사용
- "메자닌 운영팀입니다" 사용 금지 → 가정형으로 (예: "승인 시, 메자닌 기획 파트너 명의로 발송됩니다")
- 아직 컨택하지 않은 브랜드임 — 운영팀 자칭 절대 금지

브랜드명: ${productName}
카테고리: ${category || "미입력"}
매트릭스 위치: ${quadrant}
담당자 결정: ${decision || "미결정"}

반드시 다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "dream_result": "이 브랜드가 공간에 가져올 구체적인 장면. 예: '향초 브랜드 → 토요일 오후 2시, 입구 향기가 20m 앞에서 발걸음을 멈춘다'",
  "possibility": "왜 이 공간에 잘 맞는가. 실증 근거 없으면 [실증자료필요] 태그",
  "time_lag": "입점 효과가 나타나는 시점",
  "effort": "브랜드 측 준비 부담을 줄인 핵심 제안 (설치·운영 최소화 등)",
  "hook": "제안서 첫 줄 — 브랜드 담당자 시선 잡는 1줄",
  "needs_evidence": false
}`;
  } else {
    const marginPct =
      price && purchasePrice
        ? Math.round(((price - purchasePrice) / price) * 100)
        : null;

    const quadrant =
      x >= 50 && y >= 50 ? "Major Projects (수요↑ 마진↑ — 주력 확대)" :
      x < 50  && y >= 50 ? "Quick Wins (수요↓ 마진↑ — 마진 방어 우선)" :
      x < 50  && y < 50  ? "Fill Ins (수요↓ 마진↓ — 유지 또는 철수 검토)" :
                           "Thankless Tasks (수요↑ 마진↓ — 볼륨 or 가격 재설계)";

    prompt = `당신은 한국 스마트스토어 광고 전략 전문가입니다.
아래 상품 정보를 바탕으로 "거절 못 할 오퍼"의 5개 항목 초안을 생성하세요.
이 초안은 셀러가 직접 다듬을 초안입니다. 완성본이 아닙니다.
실증 자료(KC인증서·시험성적서·실측 데이터)가 없는 수치 주장은 쓰지 말고, 필요하면 needs_evidence: true를 달아주세요.

상품명: ${productName}
카테고리: ${category || "미입력"}
판매가: ${price ? Number(price).toLocaleString() + "원" : "미입력"}
마진율: ${marginPct !== null ? marginPct + "%" : "미입력"}
4사분면 위치: ${quadrant}
현재 결정: ${decision || "미결정"}

반드시 다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "dream_result": "고객 삶에서 해결하는 구체적 장면. 막연한 표현 금지. 예: '다리미판 → 출근 전 5분, 구김 없이 나간다'",
  "possibility": "진짜 될까? 의심 제거 근거. 실증 자료 없으면 문장 끝에 [실증자료필요] 태그 달기",
  "time_lag": "효과 보는 시점. 생활용품은 '받는 즉시' 류로",
  "effort": "고객 수고·희생을 줄인 핵심 메시지",
  "hook": "0~3초 시선 잡는 후킹 1줄",
  "needs_evidence": false
}`;
  }

  try {
    const text = await callClaude(prompt, 500, { feature: "offer" });
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    let depth = 0, start = -1;
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === "{") { if (depth === 0) start = i; depth++; }
      else if (clean[i] === "}") {
        depth--;
        if (depth === 0 && start !== -1) {
          return NextResponse.json(JSON.parse(clean.slice(start, i + 1)));
        }
      }
    }
    return NextResponse.json({ error: "파싱 실패" }, { status: 500 });
  } catch (e) {
    const isRateLimit = String(e).includes("GEMINI_RATE_LIMIT");
    return NextResponse.json(
      { error_type: isRateLimit ? "rate_limit" : "server_error" },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
