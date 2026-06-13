export const maxDuration = 300;

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

// ── 제외 리스트 ───────────────────────────────────────────────────────────────
const EXCLUSION_HANDLES = new Set([
  "noknock.comma", "knockcomma", "noknockcomma",
  "thearomashop", "the_aromashop",
  "aromatica_kr", "aromatica",
  "demi_fleur", "demipleur", "demifleur",
  "cuoca_official", "cuoca",
]);
const EXCLUSION_NAMES = [
  "노크콤마", "더아로마샵", "아로마티카", "데미플로", "쿠오카",
  "씨엔", "스택 베이커리", "봄날엔",
];

function isExcluded(name: string, handle: string): boolean {
  const h = handle.replace(/^@/, "").toLowerCase();
  if (EXCLUSION_HANDLES.has(h)) return true;
  return EXCLUSION_NAMES.some(n => name.includes(n) || n.includes(name.trim()));
}

// ── 기존 DB 핸들 로드 ─────────────────────────────────────────────────────────
async function loadExistingHandles(): Promise<Set<string>> {
  try {
    const res = await db.execute("SELECT instagram_handle FROM mezzanine_brands WHERE instagram_handle != ''");
    return new Set(
      (res.rows as Record<string, unknown>[])
        .map(r => String(r.instagram_handle ?? "").toLowerCase().replace(/^@/, ""))
        .filter(Boolean)
    );
  } catch { return new Set(); }
}

// ── 실증 검색 템플릿 (오늘 실제 수확 기준 — LLM 생성 금지) ─────────────────────
// 규칙: 정확구 따옴표 최대 2개 · 지역 광역 OR 3개 · 제외 연산자 유지
const PROVEN_QUERIES: Record<string, string[]> = {
  wellness: [
    `site:instagram.com "웰니스" "팝업" 은평 OR 마포 OR 서대문 -병원 -의원 -의료기기 -대행`,
    `site:instagram.com "바디케어" "팝업" 서울 OR 서대문 OR 마포 -병원 -의원 -의료기기 -대행`,
    `site:instagram.com "아로마" "팝업" 서울 OR 홍대 OR 마포 -병원 -의원 -대행`,
    `site:instagram.com 더현대 OR 신세계 OR AK "팝업" 웰니스 OR 바디케어 -대행 -채용`,
  ],
  bakery_fb: [
    // 결1 베이커리 (낮) — 서북권
    `site:instagram.com "스콘" OR "소금빵" 연희 OR 은평 OR 서대문 -대행`,
    // 결2 디저트·구움과자 (낮) — 서북권 OR 마포
    `site:instagram.com "약과" OR "휘낭시에" 연희 OR 연남 OR 마포 -대행`,
    // 결3 커피·로스터리 (낮) — 서북권 (카페 단독 금지)
    `site:instagram.com "드립백" OR "싱글오리진" 서대문 OR 은평 OR 연희 -대행`,
    // 결4 양조·내추럴와인 (밤) — 연남권
    `site:instagram.com "내추럴와인" OR "수제맥주" 연남 OR 합정 OR 마포 -대행`,
    // 결5 로컬 식당·델리 (밤) — 서북권
    `site:instagram.com "비스트로" OR "다이닝" 서대문 OR 은평 OR 연희 -대행`,
  ],
  ip_content: [
    `site:instagram.com "굿즈" "팝업" 서울 OR 마포 OR 합정 -대행 -채용`,
    `site:instagram.com "캐릭터" "팝업" 서울 OR 홍대 OR 합정 -대행`,
    `site:instagram.com "IP" "팝업" 서울 OR 합정 OR 홍대 -대행 -채용`,
    `site:instagram.com 더현대 OR 신세계 "팝업" 굿즈 OR 캐릭터 -대행 -채용`,
  ],
  performance: [
    `site:instagram.com "공연" "팝업" 서울 OR 마포 OR 합정 -대행 -채용`,
    `site:instagram.com "굿즈" "팝업" 서울 OR 홍대 OR 서대문 -대행`,
    `site:instagram.com 더현대 OR 신세계 "팝업" 공연 OR 굿즈 -대행 -채용`,
  ],
  outdoor: [
    `site:instagram.com "캠핑" "팝업" 서울 OR 마포 OR 서대문 -대행`,
    `site:instagram.com "아웃도어" "팝업" 서울 OR 은평 OR 서대문 -대행 -채용`,
    `site:instagram.com 더현대 OR 신세계 "팝업" 캠핑 OR 아웃도어 -대행`,
  ],
  fashion: [
    `site:instagram.com "패션" "팝업" 서울 OR 마포 OR 홍대 -대행 -채용`,
    `site:instagram.com "스트리트" "팝업" 서울 OR 홍대 OR 합정 -대행`,
    `site:instagram.com 더현대 OR 신세계 "팝업" 패션 OR 스트리트 -대행`,
  ],
  beauty: [
    `site:instagram.com "뷰티" "팝업" 서울 OR 마포 OR 서대문 -병원 -의원 -대행`,
    `site:instagram.com "스킨케어" "팝업" 서울 OR 홍대 OR 합정 -대행`,
    `site:instagram.com 더현대 OR 신세계 "팝업" 뷰티 OR 스킨케어 -대행 -채용`,
  ],
};

function getProvenQueries(category: string): string[] {
  return PROVEN_QUERIES[category] ?? [
    `site:instagram.com "팝업" 서울 OR 마포 OR 서대문 ${category} -대행 -채용`,
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SerpItem { url: string; title: string; snippet: string; query: string; }

interface SerpResult {
  items:       SerpItem[];
  status:      "ok" | "empty" | "error";
  error?:      string;
  http_status?: number;
  query:       string;
}

interface FableRaw {
  name: string; handle: string; url: string;
  account_type: string; category_signal: string; aesthetic: string;
  result_fit: number; d2c_small: number; anchor_fit: number; reason: string;
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

// ── Google Custom Search JSON API ─────────────────────────────────────────────

async function fetchSerp(query: string, cseKey: string, cseCx: string): Promise<SerpResult> {
  let httpStatus: number | undefined;
  const key = cseKey.trim();
  const cx  = cseCx.trim();
  const endpoint = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&num=10&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
    httpStatus = res.status;

    const data = await res.json() as {
      items?: Array<{ link: string; title: string; snippet: string }>;
      error?: { code: number; message: string; status?: string };
    };

    if (!res.ok) {
      // 키 마스킹 후 서버 로그 출력 — 클라이언트 응답에는 포함 안 함
      console.error("[batch-discover] CSE error", {
        status: res.status,
        error_status: data.error?.status,
        message: data.error?.message,
        q_length: query.length,
        cx_prefix: cx.slice(0, 6),
      });
      return {
        items: [], status: "error",
        error: `${data.error?.status ?? `HTTP ${res.status}`}: ${data.error?.message ?? "unknown"}`,
        http_status: res.status, query,
      };
    }

    const items: SerpItem[] = (data.items ?? [])
      .filter(i => i.link?.includes("instagram.com/"))
      .map(i => ({ url: i.link, title: i.title ?? "", snippet: i.snippet ?? "", query }));

    return { items, status: items.length > 0 ? "ok" : "empty", http_status: res.status, query };
  } catch (e) {
    console.error("[batch-discover] CSE fetch exception", { error: String(e), q_length: query.length });
    return { items: [], status: "error", error: String(e), http_status: httpStatus, query };
  }
}

// ── 지수 백오프 재시도 (429·503 등 일시 차단 시) ──────────────────────────────
async function fetchSerpRetry(query: string, cseKey: string, cseCx: string): Promise<SerpResult> {
  const DELAYS = [2000, 4000, 8000];
  let last: SerpResult = { items: [], status: "error", error: "init", query };

  for (let attempt = 0; attempt <= DELAYS.length; attempt++) {
    if (attempt > 0) await sleep(DELAYS[attempt - 1]);
    last = await fetchSerp(query, cseKey, cseCx);

    if (last.status !== "error") return last;

    const isRetryable =
      last.http_status === 503 || last.http_status === 429 ||
      (last.error ?? "").toLowerCase().includes("rate limit") ||
      (last.error ?? "").toLowerCase().includes("quota");

    if (!isRetryable) return last;
  }
  return last;
}

// ── Fable 5 스코어링 ──────────────────────────────────────────────────────────

const CAT_VENUE_CONTEXT: Record<string, string> = {
  wellness:    "쿨링·바디·아로마·웰니스",
  bakery_fb:   "팝업마켓·베이커리·디저트·F&B·지역 커뮤니티 집객",
  performance: "공연·굿즈·라이브 퍼포먼스·팬덤 커뮤니티",
  outdoor:     "캠핑·아웃도어·액티브·루프탑 체험",
  fashion:     "패션·스트리트·컨템포러리·팝업 리테일",
  ip_content:  "IP·캐릭터·굿즈·팬덤 콘텐츠",
  beauty:      "뷰티·스킨케어·코스메틱·체험형",
};

async function scoreWithFable(items: SerpItem[], category: string, client: Anthropic): Promise<{ results: FableRaw[]; error?: string }> {
  const venueContext = CAT_VENUE_CONTEXT[category] ?? "팝업·브랜드 체험";
  const itemsText = items.map((item, i) =>
    `[${i + 1}] URL: ${item.url}\n제목: ${item.title}\n스니펫: ${item.snippet}`
  ).join("\n\n");

  try {
    const msg = await client.messages.create({
      model: "claude-fable-5",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `메자닌 북가좌 입점 후보 추출 — 카테고리: ${category} / 공간 결: ${venueContext}

아래 SERP 결과 ${items.length}건 분석:

${itemsText}

규칙:
1. instagram.com 계정만. 뉴스·블로그 제외.
2. account_type: brand=소브랜드/D2C | media=매거진/미디어 | venue=공간/복합시설 | event=페스티벌/마켓 | personal=개인후기
3. brand 외 계정도 포함, account_type 정확히.
4. 핸들: instagram.com/handle → "@handle"

JSON 배열만:
[{"name":"","handle":"@...","url":"https://instagram.com/...","account_type":"brand|media|venue|event|personal","category_signal":"","aesthetic":"","result_fit":0|1|2,"d2c_small":0|1,"anchor_fit":0|1|2,"reason":"핸들·스니펫 기반 추정 — [판단근거]"}]`,
      }],
    });
    const block = msg.content.find(b => b.type === "text");
    const raw = block && block.type === "text" ? block.text : "";
    const j0 = raw.indexOf("["), j1 = raw.lastIndexOf("]");
    if (j0 === -1 || j1 === -1) return { results: [], error: "Fable 응답에 JSON 배열 없음" };
    return { results: JSON.parse(raw.slice(j0, j1 + 1)) as FableRaw[] };
  } catch (e) {
    return { results: [], error: String(e) };
  }
}

// ── DB 적재 ───────────────────────────────────────────────────────────────────

async function writeAiDraft(item: FableRaw, category: string, sourceQuery: string, serpSnippet: string): Promise<"wrote" | "error"> {
  try {
    const handle = (item.handle ?? "").replace(/^@/, "").toLowerCase();
    const name   = item.name?.trim() || handle;
    if (!handle || !item.url?.includes("instagram.com")) return "error";

    const kMatch = serpSnippet.match(/(\d+(?:\.\d+)?)\s*[Kk]/);
    const followersEst = kMatch ? Math.round(parseFloat(kMatch[1]) * 1000) : 0;
    const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const coreInfo = JSON.stringify({
      account_type:  item.account_type ?? "brand",
      aesthetic:     item.aesthetic ?? "",
      source_query:  sourceQuery,
      followers_est: followersEst,
      discovered_at: new Date().toISOString(),
      fable_reason:  item.reason ?? "",
    });

    await db.execute({
      sql: `INSERT INTO mezzanine_brands
              (id, name, instagram_handle, category, dong, season, followers, popup_count,
               region, source_type, core_info, dynamic_filters, matrix_x, matrix_y,
               gemini_reason, contact_status, status, url)
            VALUES (?, ?, ?, ?, 'TBD', 'all', ?, 0, '', 'AI_BATCH', ?, '{}', ?, ?, ?, 'untouched', 'ai_draft', ?)`,
      args: [
        id, name, handle, category, followersEst, coreInfo,
        Math.min(100, Math.max(1, (Number(item.result_fit) || 0) * 33 + 17)),
        Math.min(100, Math.max(1, (Number(item.anchor_fit) || 0) * 33 + 17)),
        item.reason ?? "",
        item.url,
      ],
    });
    return "wrote";
  } catch { return "error"; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey  = process.env.ANTHROPIC_API_KEY;
  const cseKey  = process.env.GOOGLE_CSE_API_KEY;
  const cseCx   = process.env.GOOGLE_CSE_CX;

  if (!apiKey)  return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정"   }, { status: 500 });
  if (!cseKey)  return NextResponse.json({ error: "GOOGLE_CSE_API_KEY 미설정"  }, { status: 500 });
  if (!cseCx)   return NextResponse.json({ error: "GOOGLE_CSE_CX 미설정"       }, { status: 500 });

  const body = await request.json() as { categories?: string[]; dry_run?: boolean; max_per_cat?: number };
  const categories = body.categories ?? ["wellness", "bakery_fb", "ip_content"];
  const dryRun     = body.dry_run    ?? false;
  const maxPerCat  = body.max_per_cat ?? 30;

  const client = new Anthropic({ apiKey });
  const existingHandles = await loadExistingHandles();

  const summary: Array<{
    category:             string;
    queries:              string[];
    query_statuses:       Array<{ query: string; status: string; count: number; error?: string }>;
    serp_raw:             number;
    after_account_filter: number;
    after_excl_filter:    number;
    wrote:                number;
    skipped_dup:          number;
    skipped_excl:         number;
    fable_error?:         string;
    brands:               Array<{ handle: string; name: string; account_type: string; score: number; url: string }>;
  }> = [];

  let totalWrote = 0;

  for (const category of categories) {
    const catResult = {
      category,
      queries:              [] as string[],
      query_statuses:       [] as Array<{ query: string; status: string; count: number; error?: string }>,
      serp_raw:             0,
      after_account_filter: 0,
      after_excl_filter:    0,
      wrote:                0,
      skipped_dup:          0,
      skipped_excl:         0,
      fable_error:          undefined as string | undefined,
      brands:               [] as Array<{ handle: string; name: string; account_type: string; score: number; url: string }>,
    };

    // 1. 실증 쿼리 템플릿 (LLM 생성 아님)
    const queries = getProvenQueries(category);
    catResult.queries = queries;

    // 2. SERP 수집 (직렬 + 쿼리 간 2.5s 딜레이 + 과부하 지수 백오프)
    const seen = new Set<string>();
    const allItems: SerpItem[] = [];
    for (let qi = 0; qi < queries.length; qi++) {
      if (qi > 0) await sleep(2500); // 쿼리 간 간격
      const result = await fetchSerpRetry(queries[qi], cseKey, cseCx);
      catResult.query_statuses.push({
        query:  queries[qi],
        status: result.status,
        count:  result.items.length,
        ...(result.error ? { error: result.error } : {}),
      });
      for (const item of result.items) {
        if (item.url.includes("instagram.com/") && !seen.has(item.url)) {
          seen.add(item.url);
          allItems.push(item);
        }
      }
    }
    catResult.serp_raw = allItems.length;

    if (!allItems.length) { summary.push(catResult); continue; }

    // 3. Fable 5 스코어링
    const { results: fableResults, error: fableError } = await scoreWithFable(allItems.slice(0, 30), category, client);
    if (fableError) catResult.fable_error = fableError;

    // 4. brand 필터
    const brandOnly = fableResults.filter(r => (r.account_type ?? "brand") === "brand");
    catResult.after_account_filter = brandOnly.length;

    // 5. 제외 리스트 + DB 중복
    const eligible: Array<{ raw: FableRaw; item: SerpItem }> = [];
    for (const raw of brandOnly) {
      const handle = (raw.handle ?? "").replace(/^@/, "").toLowerCase();
      if (isExcluded(raw.name ?? "", handle)) { catResult.skipped_excl++; continue; }
      if (existingHandles.has(handle))         { catResult.skipped_dup++;  continue; }
      eligible.push({ raw, item: allItems.find(i => i.url === raw.url) ?? allItems[0] });
    }
    catResult.after_excl_filter = eligible.length;

    // 6. DB 적재
    for (const { raw, item } of eligible.slice(0, maxPerCat)) {
      const score = (Number(raw.result_fit) || 0) + (Number(raw.d2c_small) || 0) + (Number(raw.anchor_fit) || 0);
      catResult.brands.push({
        handle:       (raw.handle ?? "").replace(/^@/, ""),
        name:         raw.name ?? "",
        account_type: raw.account_type ?? "brand",
        score,
        url:          raw.url,
      });

      if (!dryRun) {
        const res = await writeAiDraft(raw, category, item.query, item.snippet);
        if (res === "wrote") {
          catResult.wrote++;
          existingHandles.add((raw.handle ?? "").replace(/^@/, "").toLowerCase());
        }
      } else {
        catResult.wrote++;
      }
    }

    totalWrote += catResult.wrote;
    summary.push(catResult);
  }

  return NextResponse.json({
    ok:          true,
    dry_run:     dryRun,
    total_wrote: totalWrote,
    summary,
    note: dryRun
      ? "dry_run=true — DB 미적재. dry_run:false로 재호출하면 적재."
      : `ai_draft ${totalWrote}건 적재. GET /api/mezzanine/brands?source_type=AI_BATCH 로 확인.`,
  });
}
