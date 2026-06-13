export const maxDuration = 60;

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ── Types ─────────────────────────────────────────────────────────────

interface SerpItem {
  url: string;
  title: string;
  snippet: string;
  query: string;
}

interface FableRaw {
  name: string;
  handle: string;
  url: string;
  category_signal: string;
  aesthetic: string;
  result_fit: number;
  d2c_small: number;
  anchor_fit: number;
  reason: string;
  account_type: string; // brand | media | venue | event | personal
}

interface CandidateScores {
  followers: number;    // 0-1  (스니펫 파싱 — 불명확시 0)
  result_fit: number;   // 0-2  (Fable — 결·카테고리 적합도)
  d2c_small: number;    // 0-1  (Fable — 소형 D2C 여부)
  no_fb: number;        // 0-1  (룰 — F&B 키워드 없으면 1)
  popup_signal: number; // 0-1  (룰 — 팝업·마켓 키워드)
  anchor_fit: number;   // 0-2  (Fable — 김중만 감성 공간 결 일치도)
}

interface Candidate {
  name: string;
  handle: string;
  url: string;
  snippet: string;
  source_query: string;
  scores: CandidateScores;
  total_score: number; // max 8
  fable_reason: string;
  account_type: string; // brand | media | venue | event | personal
  // 자동화 경계 — 이 두 항목은 사람 판단 필수
  human_checks: ["서북권 연고", "최종 결 확인"];
}

// ── 카테고리별 공간 결 컨텍스트 (extractWithFable 프롬프트에 주입) ──────────
const CAT_VENUE_CONTEXT: Record<string, string> = {
  bakery_fb:   "팝업마켓·베이커리·디저트·F&B·지역 커뮤니티 집객",
  wellness:    "쿨링·바디·아로마·웰니스",
  performance: "공연·굿즈·라이브 퍼포먼스·팬덤 커뮤니티",
  outdoor:     "캠핑·아웃도어·액티브·루프탑 체험",
  fashion:     "패션·스트리트·컨템포러리·팝업 리테일",
  ip_content:  "IP·캐릭터·굿즈·팬덤 콘텐츠",
  beauty:      "뷰티·스킨케어·코스메틱·체험형",
};

// ── SERP 수집: Gemini Google Search 그라운딩 (CSE 불필요) ──────────────

interface GeminiGroundingChunk { web?: { uri: string; title: string } }
interface GeminiResp {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: GeminiGroundingChunk[] };
  }>;
}

async function fetchSerp(query: string, geminiKey: string): Promise<SerpItem[]> {
  try {
    const prompt = `Google 검색을 실행하세요: ${query}

검색 결과에서 Instagram 계정 URL(instagram.com/...)을 모두 찾아 아래 JSON 형식으로만 반환하세요:
[{"url":"https://www.instagram.com/handle","title":"계정명","snippet":"팔로워 수·설명"}]

Instagram URL이 없으면 빈 배열 []만 반환.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 1500 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json() as GeminiResp;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? "";

    // 1) groundingChunks에서 instagram URL 직접 추출
    const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const chunkItems: SerpItem[] = chunks
      .filter(c => c.web?.uri?.includes("instagram.com/"))
      .map(c => ({ url: c.web!.uri, title: c.web!.title ?? "", snippet: text, query }));

    // 2) 응답 텍스트에서 JSON 배열 파싱 시도
    const jsonStart = text.indexOf("[");
    const jsonEnd   = text.lastIndexOf("]");
    let textItems: SerpItem[] = [];
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Array<{ url?: string; title?: string; snippet?: string }>;
        textItems = parsed
          .filter(i => i.url?.includes("instagram.com/"))
          .map(i => ({ url: i.url!, title: i.title ?? "", snippet: i.snippet ?? text, query }));
      } catch { /* fallback to chunks only */ }
    }

    // 두 소스 합치고 URL 기준 중복 제거
    const merged = new Map<string, SerpItem>();
    for (const item of [...chunkItems, ...textItems]) {
      if (!merged.has(item.url)) merged.set(item.url, item);
    }
    return Array.from(merged.values());
  } catch { return []; }
}

// ── Rule-based signal parsers ──────────────────────────────────────────

function parseFollowers(snippet: string): number {
  // "5.2K Followers", "1.2만 팔로워", "8천", "12K" 등
  const kMatch = snippet.match(/(\d+(?:\.\d+)?)\s*[Kk]\s*(?:Follower|follower|팔로워)?/);
  if (kMatch) {
    const n = parseFloat(kMatch[1]) * 1000;
    return n >= 5000 && n <= 20000 ? 1 : 0;
  }
  const manMatch = snippet.match(/(\d+(?:\.\d+)?)\s*만\s*(?:\d+\s*천)?\s*(?:팔로워|명)?/);
  if (manMatch) {
    const n = parseFloat(manMatch[1]) * 10000;
    return n >= 5000 && n <= 20000 ? 1 : 0;
  }
  return 0; // 불명확 → 0 (Gate A에서 사람이 확인)
}

function hasFbSignal(text: string): boolean {
  return /베이커리|카페|빵|bread|coffee|식품|디저트|bakery|먹거리/i.test(text);
}

function hasPopupSignal(text: string): boolean {
  return /팝업|pop.?up|플리마켓|마켓|market/i.test(text);
}

// ── 쿼리 생성: Sonnet 4.6 (thinking 불필요, 빠르고 저렴) ─────────────────

// 카테고리별 핵심 키워드 (백화점 도킹 패턴용)
const CAT_DEPT_KEYWORD: Record<string, string> = {
  wellness:    "웰니스 OR 아로마 OR 바디케어",
  bakery_fb:   "베이커리 OR 디저트 OR 카페",
  performance: "공연 OR 굿즈 OR 팝업",
  outdoor:     "캠핑 OR 아웃도어",
  fashion:     "패션 OR 스트리트",
  ip_content:  "굿즈 OR 캐릭터 OR IP",
  beauty:      "뷰티 OR 스킨케어",
};

async function generateQueries(category: string, client: Anthropic): Promise<string[]> {
  const deptKeyword = CAT_DEPT_KEYWORD[category] ?? "팝업";
  // 백화점 패턴은 "검증된 상권 팝업 이력" 자동 확보 금광 — 고정 1개
  const deptQuery = `site:instagram.com 더현대 OR 신세계 OR AK "팝업" ${deptKeyword} -대행 -채용`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `메자닌 북가좌 (서울 서대문구 복합문화공간) 입점 후보 발굴용 Google dorking 쿼리 3개 추가.
카테고리: ${category}

교훈: "카테고리키워드" "팝업" 조합이 단독 카테고리보다 압도적으로 잘 잡힌다.

린 dorking 규칙 (위반 시 결과 0건):
- site:instagram.com 으로 시작
- 따옴표("") 쿼리당 최대 2개
- 지역어·수식어는 따옴표 없이 (서울 OR 마포 OR 서대문)
- 분석가 합성어("서울 서북권" 등) 따옴표 금지
- 브랜드명·계정명 생성 금지
- 반드시 "팝업" OR 마켓 OR 플리마켓 키워드 포함

JSON 배열만 (3개): ["쿼리1","쿼리2","쿼리3"]`,
    }],
  });
  const block = msg.content.find(b => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";
  const match = raw.match(/\[[\s\S]*\]/);
  let generated: string[] = [];
  try { generated = (JSON.parse(match?.[0] ?? "[]") as string[]).slice(0, 3); }
  catch { /* fallback to empty */ }

  // 백화점 패턴 고정 추가 (총 4개)
  return [...generated, deptQuery].slice(0, 5);
}

// ── Fable 5 extraction + judgment ─────────────────────────────────────

async function extractWithFable(items: SerpItem[], category: string, client: Anthropic): Promise<FableRaw[]> {
  const venueContext = CAT_VENUE_CONTEXT[category] ?? "팝업·브랜드 체험";
  const itemsText = items.map((item, i) =>
    `[${i + 1}] URL: ${item.url}\n제목: ${item.title}\n스니펫: ${item.snippet}`
  ).join("\n\n");

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `메자닌 북가좌 입점 후보 추출 임무.

공간: 서울 서대문구 증산역, 복합문화공간 350평. 김중만 사진작가 기획.
이번 발굴 카테고리: ${category}
이 카테고리의 공간 결: ${venueContext}

아래 구글 SERP 결과 ${items.length}건을 분석하세요:

${itemsText}

추출 규칙:
1. instagram.com 계정 URL만 대상. 뉴스·블로그·포털 제외.
2. 실제 소브랜드·D2C 판매자 계정만 (공식 대기업·매거진·대행사 제외)
3. URL에서 핸들 추출: instagram.com/handle → "@handle"
4. account_type 분류 (반드시 정확히):
   - brand: 소브랜드·D2C 판매자 (발굴 대상)
   - media: 매거진·블로그·미디어 계정
   - venue: 공간·복합문화시설·행사장
   - event: 페스티벌·마켓·행사 계정
   - personal: 개인 후기·일상 계정
5. 판단 필드 — 반드시 "${venueContext}" 기준으로 채점:
   - result_fit (0-2): ${category} 카테고리 및 "${venueContext}" 결 적합도
   - d2c_small (0-1): 소형 D2C 브랜드 여부
   - anchor_fit (0-2): "${venueContext}" 공간 앵커로서의 결 일치도

JSON 배열만 반환 (인스타 계정 아닌 항목 완전 제외):
[{
  "name": "브랜드명",
  "handle": "@핸들",
  "url": "https://instagram.com/...",
  "account_type": "brand|media|venue|event|personal",
  "category_signal": "감지 카테고리",
  "aesthetic": "브랜드 결 1문장",
  "result_fit": 0|1|2,
  "d2c_small": 0|1,
  "anchor_fit": 0|1|2,
  "reason": "${category} 기준 종합 판단 1문장 (핸들·스니펫 기반 추정임을 명시)"
}]`,
    }],
  });

  const block = msg.content.find(b => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";
  const jsonStart = raw.indexOf("[");
  const jsonEnd   = raw.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) return [];
  try { return JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as FableRaw[]; }
  catch { return []; }
}

// ── 6필터 스코어링 (수동·자동 공용) ───────────────────────────────────────

function buildCandidates(fableResults: FableRaw[], items: SerpItem[], category: string): Candidate[] {
  const isFnb = category === "bakery_fb";
  const candidates: Candidate[] = fableResults
    .filter(fc => fc.url?.includes("instagram.com"))
    .map(fc => {
      const matched  = items.find(i => i.url === fc.url) ?? items[0];
      const fullText = `${fc.name} ${matched?.title ?? ""} ${matched?.snippet ?? ""}`;
      const fbHit    = hasFbSignal(fullText);
      const scores: CandidateScores = {
        followers:    parseFollowers(matched?.snippet ?? ""),
        result_fit:   Math.min(2, Math.max(0, Number(fc.result_fit) || 0)),
        d2c_small:    Math.min(1, Math.max(0, Number(fc.d2c_small)  || 0)),
        // F&B 카테고리일 땐 F&B 신호가 있어야 득점(우대), 아닐 땐 없어야 득점(제외)
        no_fb:        isFnb ? (fbHit ? 1 : 0) : (fbHit ? 0 : 1),
        popup_signal: hasPopupSignal(fullText) ? 1 : 0,
        anchor_fit:   Math.min(2, Math.max(0, Number(fc.anchor_fit) || 0)),
      };
      return {
        name:         fc.name         ?? "",
        handle:       fc.handle       ?? "",
        url:          fc.url          ?? "",
        snippet:      matched?.snippet ?? "",
        source_query: matched?.query   ?? "",
        scores,
        total_score:  Object.values(scores).reduce((a, b) => a + b, 0),
        fable_reason: fc.reason        ?? "",
        account_type: fc.account_type  ?? "brand",
        human_checks: ["서북권 연고", "최종 결 확인"] as ["서북권 연고", "최종 결 확인"],
      };
    });
  candidates.sort((a, b) => b.total_score - a.total_score);
  return candidates;
}

// ── Main handler ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey    = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!apiKey)    return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 500 });
  if (!geminiKey) return NextResponse.json({ error: "GEMINI_API_KEY 미설정"    }, { status: 500 });

  try {
    const body = await request.json() as { category?: string; queries?: string[]; urls?: string[] };
    const category = body.category ?? "wellness";
    const client = new Anthropic({ apiKey });

    // ── urls 직접 입력 모드 (수동 dorking 후 붙여넣기) ──────────────────────
    if (body.urls?.length) {
      const seen = new Set<string>();
      const allItems: SerpItem[] = [];
      for (const raw of body.urls.slice(0, 30)) {
        const url = raw.trim();
        if (url && !seen.has(url)) {
          seen.add(url);
          allItems.push({ url, title: "", snippet: "", query: "manual" });
        }
      }
      const fableResults = await extractWithFable(allItems, category, client);
      const candidates = buildCandidates(fableResults, allItems, category);
      return NextResponse.json({
        mode: "manual_urls",
        category,
        candidates,
        urls_input: allItems.length,
        total: candidates.length,
        automation_boundary: {
          auto:  ["결 적합도(0-2)", "D2C·소형(0-1)", "F&B 우대·제외(0-1)", "팝업 신호(0-1)", "앵커 핏(0-2)"],
          human: ["팔로워 수 확인", "서북권 연고", "최종 결 확인"],
        },
        scoring_max: 7,
      });
    }

    // ── 자동 SERP 모드 ──────────────────────────────────────────────────────
    // Step 1: 쿼리 확보 (제공 or Sonnet 생성)
    let queries: string[] = body.queries?.slice(0, 5) ?? [];
    if (!queries.length) {
      queries = await generateQueries(category, client);
    }
    if (!queries.length) {
      return NextResponse.json({ error: "쿼리 생성 실패" }, { status: 500 });
    }

    // Step 2: SERP 수집 (병렬)
    const serpBatches = await Promise.all(
      queries.map(q => fetchSerp(q, geminiKey))
    );

    // instagram.com URL만 중복 제거
    const seen = new Set<string>();
    const allItems: SerpItem[] = [];
    for (const batch of serpBatches) {
      for (const item of batch) {
        if (item.url.includes("instagram.com/") && !seen.has(item.url)) {
          seen.add(item.url);
          allItems.push(item);
        }
      }
    }

    if (!allItems.length) {
      return NextResponse.json({
        candidates: [], queries_used: queries, serp_results: 0,
        note: "SERP에서 Instagram URL 없음. urls 배열로 직접 입력하거나 쿼리를 조정하세요.",
      });
    }

    // Step 3: Fable 5 추출 + 판단
    const fableResults = await extractWithFable(allItems.slice(0, 30), category, client);

    // Step 4: 6필터 스코어링
    const candidates = buildCandidates(fableResults, allItems, category);

    return NextResponse.json({
      category,
      candidates,
      queries_used:  queries,
      serp_results:  allItems.length,
      total:         candidates.length,
      automation_boundary: {
        auto:   ["결 적합도(0-2)", "D2C·소형(0-1)", "F&B 우대·제외(0-1)", "팝업 신호(0-1)", "팔로워 추정(0-1)", "앵커 핏(0-2)"],
        human:  ["서북권 연고 — 지역 연결고리는 SERP에서 추출 불가", "최종 결 확인 — 계정 직접 열람 필수"],
      },
      scoring_max: 8,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAuth  = msg.includes("401") || msg.includes("authentication") || msg.includes("api_key");
    const isQuota = msg.includes("402") || msg.includes("credit") || msg.includes("quota") || msg.includes("billing");
    const isModel = msg.includes("404") || msg.includes("model");
    const code = isAuth ? "auth_error" : isQuota ? "quota_error" : isModel ? "model_error" : "server_error";
    return NextResponse.json(
      { error: msg.slice(0, 200), error_code: code },
      { status: 500 }
    );
  }
}
