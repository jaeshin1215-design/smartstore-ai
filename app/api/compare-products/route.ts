export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { logLlmUsage, geminiTokens } from "@/lib/llm-usage";

const DATALAB_URL = "https://openapi.naver.com/v1/datalab/search";
const SHOP_URL = "https://openapi.naver.com/v1/search/shop.json";
const DL_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const DL_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;

const GEMINI_SYNC = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_SYNC(process.env.GEMINI_API_KEY!), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2400, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) {
    void logLlmUsage({ feature: "compare-products", model: "gemini-2.5-flash", input_tokens: 0, output_tokens: 0, success: false });
    throw new Error(`Gemini ${res.status}`);
  }
  const data = await res.json();
  const t = geminiTokens(data);
  void logLlmUsage({ feature: "compare-products", model: "gemini-2.5-flash", input_tokens: t.input, output_tokens: t.output, success: true });
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function fetchSearchVolume(keyword: string): Promise<number> {
  if (!keyword) return 0;
  try {
    const body = {
      startDate: "2024-11-01", endDate: "2025-01-31",
      timeUnit: "month",
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    };
    const res = await fetch(DATALAB_URL, {
      method: "POST",
      headers: {
        "X-Naver-Client-Id": DL_ID,
        "X-Naver-Client-Secret": DL_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const ratios: number[] = data?.results?.[0]?.data?.map((d: { ratio: number }) => d.ratio) ?? [];
    return ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : 0;
  } catch { return 0; }
}

async function fetchCompetitors(keyword: string): Promise<number> {
  if (!keyword) return 0;
  try {
    const res = await fetch(`${SHOP_URL}?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { "X-Naver-Client-Id": DL_ID, "X-Naver-Client-Secret": DL_SECRET },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.total ?? 0;
  } catch { return 0; }
}

export async function POST(req: NextRequest) {
  const { productA, productB } = await req.json();

  if (!productA?.name || !productB?.name) {
    return NextResponse.json({ error: "상품명 필요" }, { status: 400 });
  }

  // DataLab + 쇼핑 API 병렬 호출
  const [volA, volB, compA, compB] = await Promise.all([
    fetchSearchVolume(productA.keyword || productA.name.slice(0, 6)),
    fetchSearchVolume(productB.keyword || productB.name.slice(0, 6)),
    fetchCompetitors(productA.keyword || productA.name.slice(0, 6)),
    fetchCompetitors(productB.keyword || productB.name.slice(0, 6)),
  ]);

  const fmtPrice = (p: string) => p ? Number(p).toLocaleString() + "원" : "미입력";
  const fmtVol = (v: number) => v > 0 ? v + "% (최근 3개월 평균)" : "조회 불가";
  const fmtComp = (c: number) => c > 0 ? c.toLocaleString() + "개" : "조회 불가";

  const prompt = `당신은 네이버 스마트스토어 전문 매출 분석가입니다.

두 상품을 비교해서 "안 팔리는 이유 3가지 + 개선 액션"을 분석해 주세요.

## 상품 A — 분석 대상 (덜 팔리는 것)
- 상품명: ${productA.name}
- 카테고리: ${productA.category || "미입력"}
- 판매가: ${fmtPrice(productA.price)}
- 리뷰 수: ${productA.reviews || 0}개
- 검색 키워드: ${productA.keyword}
- 키워드 검색 트렌드 (DataLab): ${fmtVol(volA)}
- 카테고리 경쟁 상품 수: ${fmtComp(compA)}

## 상품 B — 비교 기준 (잘 팔리는 것)
- 상품명: ${productB.name}
- 카테고리: ${productB.category || "미입력"}
- 판매가: ${fmtPrice(productB.price)}
- 리뷰 수: ${productB.reviews || 0}개
- 검색 키워드: ${productB.keyword}
- 키워드 검색 트렌드 (DataLab): ${fmtVol(volB)}
- 카테고리 경쟁 상품 수: ${fmtComp(compB)}

## 분석 요청
상품 A가 상품 B보다 덜 팔리는 이유를 정확히 3가지로 분석하고, 각 이유에 오늘 당장 실행 가능한 개선 액션을 제시하세요.

출력 형식 (반드시 이 형식으로, 다른 내용 추가 없이):

**이유 1: [제목]**
진단: [구체적 분석 1~2문장]
액션: [오늘 당장 할 수 있는 개선 방법]

**이유 2: [제목]**
진단: [구체적 분석 1~2문장]
액션: [오늘 당장 할 수 있는 개선 방법]

**이유 3: [제목]**
진단: [구체적 분석 1~2문장]
액션: [오늘 당장 할 수 있는 개선 방법]

**종합 우선순위:** [3가지 중 가장 먼저 할 것 한 줄]

규칙:
- 구체적 숫자 언급 (리뷰 수, 가격 차이, 검색량 지수)
- 실행 가능한 액션만 (추상적 조언 X)
- 한국어로`;

  let analysis = "";
  try {
    analysis = await callGemini(prompt);
  } catch {
    analysis = "분석 중 오류가 발생했습니다. 다시 시도해 주세요.";
  }

  return NextResponse.json({
    productA: { ...productA, searchVolume: volA, competitors: compA },
    productB: { ...productB, searchVolume: volB, competitors: compB },
    analysis,
  });
}
