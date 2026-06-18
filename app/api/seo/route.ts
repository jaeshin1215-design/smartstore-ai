export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

// 이지스토리 카테고리 본능 컨텍스트
const IZSTORY_CONTEXT: Record<string, string> = {
  "압축팩": "이지스토리 핵심 카테고리. 여행·이사·계절 수납 수요. 구매자 = 30~40대 여성, 실용·수납 효율 중시. 시즌 피크 = 5월(이사)·10월(겨울준비). 경쟁 심화 → 용량·소재 차별화 필수.",
  "다리미판": "가담다 브랜드 주력. 가정·원룸 수요 안정적. 구매자 = 20~40대, 가성비+내구성 우선. 리뷰 관리가 전환율 직결. 번들(다리미+다리미판) 전략 유효.",
  "화분": "시즌성 강함(봄·가을). 인테리어 감성 키워드 중요. 구매자 = 20~30대 여성, SNS 감성 소비. 후기 사진 품질이 노출 순위에 영향. 배송 파손 리뷰 관리 필수.",
  "유아매트": "안전 인증(KC) 필수 표기. 구매자 = 임신·육아 중 부모, 안전성 최우선. 롱테일 키워드(두께·소재·브랜드) 공략 효과적. 경쟁사 대비 두께·친환경 소재 강조 유효.",
};

function getIzstoryCtx(name: string): string {
  for (const [key, val] of Object.entries(IZSTORY_CONTEXT)) {
    if (name.includes(key)) return `\n[이지스토리 카테고리 본능] ${val}`;
  }
  return "";
}

export async function POST(req: NextRequest) {
  const { productName, category, keywords, searchVolume, competitorCount } = await req.json();
  if (!productName) return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });

  const izCtx = getIzstoryCtx(productName);
  const ctx = [
    category && `카테고리:${category}`,
    keywords && `키워드:${keywords}`,
    searchVolume && `검색량:${searchVolume}`,
    competitorCount && `경쟁수:${competitorCount}`,
  ].filter(Boolean).join(" ");

  const p1 = `스마트스토어 SEO. 상품명:"${productName}" ${ctx}${izCtx}
JSON만 출력 (설명 없이): {"action_command":"지금 '[추천명]'으로 변경 — 이유","score":{"current":"점수숫자","issues":["문제1","문제2"]},"optimized_names":[{"name":"공격적 최적화 상품명","reason":"이유","keywords_used":["k1","k2"]},{"name":"중간 최적화 상품명","reason":"이유","keywords_used":["k1","k2"]},{"name":"안전 최적화 상품명","reason":"이유","keywords_used":["k1","k2"]}]}
각 name 최대 50자`;

  const p2 = `스마트스토어 SEO 전략. 상품명:"${productName}" ${ctx}${izCtx}
JSON만 출력 (설명 없이): {"keyword_strategy":{"main_keyword":"메인키워드","sub_keywords":["롱테일1","롱테일2","롱테일3"],"recommendation":"전략 설명 (검색 트렌드·시즌성·예상 매출 영향 포함)"},"seo_tips":["팁1","팁2","팁3"],"avoid":["피할표현 — 이유"]}`;

  try {
    const [raw1, raw2] = await Promise.all([
      callClaude(p1, 1500),
      callClaude(p2, 1500),
    ]);

    function extractJson(raw: string): Record<string, unknown> | null {
      const stripped = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
      const m = stripped.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch { return null; }
    }

    const p1Parsed = extractJson(raw1) ?? {};
    const p2Parsed = extractJson(raw2) ?? {};

    // 클라이언트 기대 형식: phase1 = 상품명 결과, phase2 = 키워드 전략
    const body = [
      JSON.stringify({ type: "seo_phase1", ...p1Parsed }),
      JSON.stringify({ type: "seo_phase2", ...p2Parsed }),
    ].join("\n") + "\n";

    return new Response(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ type: "error", error: "SEO 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }) + "\n",
      {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      }
    );
  }
}
