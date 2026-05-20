export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callClaude, createGeminiStream } from "@/lib/claude";

const NAVER_API = "https://openapi.naver.com/v1/datalab/search";
const CLIENT_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const CLIENT_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function naverSearch(
  keywordGroups: { groupName: string; keywords: string[] }[],
  extra: Record<string, unknown> = {}
) {
  const { startDate, endDate } = getDateRange();
  const res = await fetch(NAVER_API, {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": CLIENT_ID,
      "X-Naver-Client-Secret": CLIENT_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate, endDate, timeUnit: "date", keywordGroups, ...extra }),
  });
  if (!res.ok) throw new Error(`Naver API ${res.status}`);
  return res.json();
}

function getAvgRatio(result: PromiseSettledResult<{ results?: { data?: { ratio: number }[] }[] }>): number {
  if (result.status !== "fulfilled") return 0;
  const data = result.value?.results?.[0]?.data ?? [];
  if (!data.length) return 0;
  return data.reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / data.length;
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

const SEASON_FALLBACKS: Record<string, string[]> = {
  "봄": ["봄옷", "캠핑용품", "다이어트", "꽃무늬원피스", "자외선차단제"],
  "여름": ["수영복", "선풍기", "에어컨청소", "여름원피스", "아이스팩"],
  "가을": ["가을자켓", "단풍여행", "핫초코", "무릎담요", "등산화"],
  "겨울": ["패딩", "핫팩", "크리스마스선물", "전기장판", "방한장갑"],
};

function handleAutoMode() {
  const encoder = new TextEncoder();
  const send = (obj: object) => encoder.encode(JSON.stringify(obj) + "\n");

  const month = new Date().getMonth() + 1;
  const season = getSeason(month);
  const fallback = SEASON_FALLBACKS[season] ?? ["인기상품", "베스트셀러", "신상품", "할인상품", "추천상품"];

  const defaultComment = (kw: string, growth: number) =>
    growth > 10  ? `지금 ${kw} 검색 급상승 중 → 바로 등록하세요` :
    growth < -10 ? `${kw} 검색 하락 중 → 가격·상품명 점검 필요` :
    `${kw} ${season} 시즌 주목 키워드 → 지금 준비하세요`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Phase 1: 즉시 fallback 전송 (0ms) ──
        controller.enqueue(send({
          type: "auto_phase",
          season,
          hotKeywords: fallback.map(kw => ({ keyword: kw, avg: 0, growth: 0, comment: `${season} 시즌 주목 키워드 → 지금 준비하세요` })),
        }));

        // Claude 키워드 생성 + Naver 단일 배치 호출 (병렬)
        let seasonKeywords = fallback;
        try {
          const raw = await callClaude(
            `지금은 ${month}월 ${season} 시즌입니다. 스마트스토어에서 지금 이 시즌에 잘 팔리는 상품 키워드 5개를 JSON 배열로만 답해주세요: ["키워드1","키워드2","키워드3","키워드4","키워드5"]`,
            150
          );
          const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
          if (Array.isArray(parsed) && parsed.length >= 3) seasonKeywords = parsed.slice(0, 5);
        } catch { /* fallback 유지 */ }

        // 5개 키워드를 단일 Naver API 호출로 한 번에 가져오기
        const groups = seasonKeywords.map(kw => ({ groupName: kw, keywords: [kw] }));
        let naverResults: { title: string; data: { ratio: number }[] }[] = [];
        try {
          const naverResult = await naverSearch(groups);
          if (Array.isArray(naverResult?.results) && naverResult.results.length > 0) {
            naverResults = naverResult.results;
          }
        } catch (e) { console.error("[auto] Naver error:", e); }

        let hotKeywords: { keyword: string; avg: number; growth: number }[];
        if (naverResults.length > 0) {
          hotKeywords = naverResults.map(r => {
            const data = r.data ?? [];
            const recentSlice = data.slice(-7);
            const prevSlice = data.slice(-14, -7);
            const recent = recentSlice.length ? recentSlice.reduce((s, d) => s + d.ratio, 0) / recentSlice.length : 0;
            const prev = prevSlice.length ? prevSlice.reduce((s, d) => s + d.ratio, 0) / prevSlice.length : 0;
            const growth = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0;
            const avg = data.length ? Math.round(data.reduce((s, d) => s + d.ratio, 0) / data.length * 10) / 10 : 0;
            return { keyword: r.title, avg, growth };
          }).sort((a, b) => b.growth - a.growth);
        } else {
          hotKeywords = seasonKeywords.map(kw => ({ keyword: kw, avg: 0, growth: 0 }));
        }

        // ── Phase 2: Naver 실데이터 즉시 전송 ──
        controller.enqueue(send({
          type: "auto_phase",
          season,
          hotKeywords: hotKeywords.map(k => ({ ...k, comment: defaultComment(k.keyword, k.growth) })),
        }));

        // AI 코멘트 (실데이터가 있을 때만)
        let comments: Record<string, string> = {};
        if (hotKeywords.length > 0 && hotKeywords[0].avg > 0) {
          try {
            const summaries = hotKeywords.map(k => `${k.keyword}: 검색지수 ${k.avg}, 전주대비 ${k.growth > 0 ? "+" : ""}${k.growth}%`).join("\n");
            const raw = await callClaude(
              `스마트스토어 셀러를 위해 각 키워드의 트렌드 한 줄 코멘트를 작성해주세요. 형식: "지금 [키워드] 검색량 [상태] → [행동 제안]" (25자 이내)\n\n${summaries}\n\nJSON 형식으로만: {"키워드1": "코멘트1", "키워드2": "코멘트2"}`,
              400
            );
            comments = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
          } catch { /* default 사용 */ }
        }

        // ── Phase 3: AI 코멘트 포함 최종 전송 ──
        controller.enqueue(send({
          type: "auto_final",
          season,
          hotKeywords: hotKeywords.map(k => ({ ...k, comment: comments[k.keyword] ?? defaultComment(k.keyword, k.growth) })),
          updatedAt: new Date().toISOString(),
        }));
      } catch {
        controller.enqueue(send({ type: "error", error: "서버 오류가 발생했습니다." }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.mode === "auto") return handleAutoMode();

  const { keyword } = body;
  if (!keyword) return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });

  const encoder = new TextEncoder();
  const send = (obj: object) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: 연관 키워드 생성
        let relatedKeywords: string[] = [];
        try {
          const raw = await callClaude(
            `"${keyword}" 스마트스토어 셀러가 실제로 검색하는 연관 키워드 4개. JSON 배열만: ["키워드1","키워드2","키워드3","키워드4"]`,
            150
          );
          relatedKeywords = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch { relatedKeywords = []; }

        const top5 = [keyword, ...relatedKeywords.slice(0, 4)];
        const top5Groups = top5.map(kw => ({ groupName: kw, keywords: [kw] }));
        const mainGroup = [{ groupName: keyword, keywords: [keyword] }];

        // Step 2: Naver API 병렬 호출
        const settledResults = await Promise.allSettled([
          naverSearch(mainGroup),
          naverSearch(mainGroup, { gender: "m" }),
          naverSearch(mainGroup, { gender: "f" }),
          naverSearch(mainGroup, { ages: ["2", "3", "4"] }),
          naverSearch(mainGroup, { ages: ["5"] }),
          naverSearch(mainGroup, { ages: ["6", "7", "8"] }),
          ...(relatedKeywords.length > 0 ? [naverSearch(top5Groups)] : []),
        ]);
        const [mainR, maleR, femaleR, age2030R, age40R, age50R] = settledResults;
        const relatedR = settledResults[6];

        // 트렌드 파싱
        let trend = { dates: [] as string[], ratios: [] as number[] };
        if (mainR.status === "fulfilled") {
          const data: { period: string; ratio: number }[] = mainR.value?.results?.[0]?.data ?? [];
          trend = {
            dates: data.map(d => d.period.slice(5)),
            ratios: data.map(d => Math.round(d.ratio * 10) / 10),
          };
        }

        // 성별
        const maleAvg = getAvgRatio(maleR);
        const femaleAvg = getAvgRatio(femaleR);
        const gTotal = maleAvg + femaleAvg || 1;
        const gender = {
          male_pct: Math.round((maleAvg / gTotal) * 100),
          female_pct: Math.round((femaleAvg / gTotal) * 100),
        };

        // 연령대
        const a2030 = getAvgRatio(age2030R);
        const a40   = getAvgRatio(age40R);
        const a50   = getAvgRatio(age50R);
        const aTotal = a2030 + a40 + a50 || 1;
        const age = {
          "10-20대": Math.round((a2030 / aTotal) * 100),
          "40대":    Math.round((a40   / aTotal) * 100),
          "50대+":   Math.round((a50   / aTotal) * 100),
        };

        // 연관 키워드
        let related: { keyword: string; avg: number; growth: number }[] = [];
        const relatedApiResult = relatedR as PromiseSettledResult<{ results?: { title: string; data: { ratio: number }[] }[] }>;
        if (relatedApiResult?.status === "fulfilled" && relatedApiResult.value?.results) {
          related = relatedApiResult.value.results.map(r => {
            const data = r.data ?? [];
            const recent = data.slice(-7).reduce((s, d) => s + d.ratio, 0) / 7;
            const prev   = data.slice(-14, -7).reduce((s, d) => s + d.ratio, 0) / 7;
            return {
              keyword: r.title,
              avg: Math.round(data.reduce((s, d) => s + d.ratio, 0) / (data.length || 1) * 10) / 10,
              growth: prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0,
            };
          });
          related.sort((a, b) => b.growth - a.growth);
        }

        // ── Phase 1: Naver 데이터 즉시 전송 ──
        controller.enqueue(send({ type: "naver", keyword, trend, gender, age, related }));

        // Step 3: AI 분석 — Gemini 스트리밍으로 토큰 실시간 수신 (Phase 2)
        const recent7 = trend.ratios.slice(-7);
        const prev7   = trend.ratios.slice(-14, -7);
        const recentAvg = recent7.reduce((s, r) => s + r, 0) / (recent7.length || 1);
        const prevAvg   = prev7.reduce((s, r) => s + r, 0)   / (prev7.length   || 1);
        const growthRate = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0;

        const aiPrompt = `스마트스토어 셀러 관점에서 키워드 트렌드를 분석하고 판단해주세요.
키워드:"${keyword}" 검색지수:${recentAvg.toFixed(1)} 증감:${growthRate > 0 ? "+" : ""}${growthRate}% 성별:남${gender.male_pct}%/여${gender.female_pct}% 연령:${Object.entries(age).map(([k,v])=>`${k} ${v}%`).join("/")} 급상승연관:${related.slice(0,3).map(r=>`${r.keyword}(${r.growth>0?"+":""}${r.growth}%)`).join(",")}
JSON만 응답: {"verdict":"good 또는 bad 또는 neutral","action_command":"지금 [액션] — 이유 한 문장","reason":"수치 근거 2문장","tips":["오늘 할 것","이번 주 할 것","타겟 공략 팁"]}`;

        let rawAi = "";
        try {
          const aiGeminiStream = createGeminiStream(aiPrompt, 300);
          const aiReader = aiGeminiStream.getReader();
          const aiDec = new TextDecoder();
          while (true) {
            const { done, value } = await aiReader.read();
            if (done) break;
            rawAi += aiDec.decode(value, { stream: true });
            controller.enqueue(send({ type: "ai_stream" }));
          }
        } catch { /* keep default */ }

        let aiAnalysis = {
          verdict: "neutral" as "good" | "bad" | "neutral",
          action_command: "검색 데이터를 수집했습니다. 아래 데이터를 참고하세요.",
          reason: "검색량 데이터를 기반으로 판단하세요.",
          tips: ["상품 등록 최적화", "키워드 활용 강화", "타겟 고객층 분석"],
        };
        try {
          aiAnalysis = JSON.parse(rawAi.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch { /* keep default */ }

        // ── Phase 2: AI 결과 전송 ──
        controller.enqueue(send({ type: "ai", aiAnalysis }));

      } catch {
        controller.enqueue(send({ type: "error", error: "서버 오류가 발생했습니다." }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
