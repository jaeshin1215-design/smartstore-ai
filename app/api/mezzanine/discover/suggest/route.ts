import { NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

export const maxDuration = 60;

const CAT_CONTEXT: Record<string, string> = {
  performance: "★ 현장검증 — 공연·굿즈 (라이콘 오디션 실증)",
  bakery_fb:   "★ 현장검증 — F&B·베이커리 (빵력장터 실증)",
  wellness:    "★ 현장검증 — 웰니스·아로마·바디케어 (MOVFLEX 실증)",
  outdoor:     "⚡ 인바운드검증 — 캠핑·아웃도어 (실제 문의 들어옴)",
  fashion:     "☆ 시장가설 — 패션 (서울 팝업 시장 26%, 이 현장 미검증)",
  ip_content:  "☆ 시장가설 — IP·콘텐츠·굿즈 (서울 시장 17%, 이 현장 미검증)",
  beauty:      "☆ 시장가설 — 뷰티 (시장 근거 있음, 이 현장 미검증)",
};

const CAT_EXCLUDE: Record<string, string> = {
  performance: "-공연장 -학원 -대행사 -기획사",
  bakery_fb:   "-프랜차이즈 -매거진 -대행 -카페체인 -스타벅스 -이디야",
  wellness:    "-병원 -의원 -의료기기 -대행",
  outdoor:     "-브랜드공식 -대리점 -수입사",
  fashion:     "-허브 -센터 -백화점 -페어 -매거진",
  ip_content:  "-출판사 -방송국 -대행사 -기획사",
  beauty:      "-허브 -센터 -백화점 -페어 -병원",
};

// 카테고리별 핵심 키워드 (따옴표 없이 OR로 조합할 것)
const CAT_CORE_KEYWORDS: Record<string, string> = {
  performance: "공연 OR 굿즈 OR 아이돌",
  // bakery_fb는 5결 세분 — CAT_EXTRA_RULES에서 전용 규칙으로 제어 (낮3/밤2 포트폴리오)
  bakery_fb:   "스콘 OR 소금빵 OR 약과 OR 드립백 OR 내추럴와인 OR 비스트로",
  wellness:    "웰니스 OR 아로마 OR 바디케어",
  outdoor:     "캠핑 OR 아웃도어 OR 등산",
  fashion:     "팝업 OR 플리마켓",
  ip_content:  "굿즈 OR IP OR 캐릭터",
  beauty:      "뷰티 OR 스킨케어 OR 코스메틱",
};

// F&B는 스마트스토어 쓰지 않음 — 나머지 카테고리는 스마트스토어 패턴 사용
const USE_SMARTSTORE: Record<string, boolean> = {
  bakery_fb: false,
};

// F&B 추가 금지 지침 (프롬프트 내 보조 블록)
const CAT_EXTRA_RULES: Record<string, string> = {
  bakery_fb: `[F&B 5결 전용 — 낮 3 / 밤 2 포트폴리오, 카테고리 중복 금지]

아래 5개 검색식을 정확히 이 순서·이 형태 그대로 출력할 것. 변형·재조합 금지.

결1 (베이커리 · 낮):
  query: site:instagram.com "스콘" OR "소금빵" 연희 OR 은평 OR 서대문 -대행
  desc: 베이커리 · 낮 집객
  tip: 소규모 로컬 베이커리 위주. 대형 프랜차이즈 자동 하향.

결2 (디저트·구움과자 · 낮):
  query: site:instagram.com "약과" OR "휘낭시에" 연희 OR 연남 OR 마포 -대행
  desc: 디저트·구움과자 · 낮 집객
  tip: 전통 과자·마들렌 계정 집중.

결3 (커피·로스터리 · 낮):
  query: site:instagram.com "드립백" OR "싱글오리진" 서대문 OR 은평 OR 연희 -대행
  desc: 커피·로스터리 · 낮~종일 집객
  tip: "카페" 단독 금지. 소형 로스터리 위주.

결4 (양조·내추럴와인 · 밤):
  query: site:instagram.com "내추럴와인" OR "수제맥주" 연남 OR 합정 OR 마포 -대행
  desc: 양조·내추럴와인 · 밤 집객
  tip: 앵커 사진전 야간 연계. 소규모 양조 위주.

결5 (로컬 식당·델리 · 밤):
  query: site:instagram.com "비스트로" OR "다이닝" 서대문 OR 은평 OR 연희 -대행
  desc: 로컬 식당·델리 · 밤 집객
  tip: 팔로워 낮을 수 있음. 수율 부족 시 "분식" OR "델리" 확장 재검색 고려.

배분: 결1×1 결2×1 결3×1 결4×1 결5×1 (총 5개, 카테고리 중복 없음)

공통 필수 규칙:
- 위 5개 query 문자열을 정확히 그대로 사용할 것
- 각 검색식 따옴표 정확구문 2개 이하 (위 5개 모두 준수됨)
- "마켓" 토큰 절대 금지
- "스마트스토어" 절대 금지
- 제외어: -대행 1개만
- 팔로워 기준: 5천~5만 (생과방·버터베이커리급 통과, 5만 이상 대형 제외)`,
};

const FOLLOWERS_HINT: Record<string, string> = {
  "1k-5k":    "1천~5천명 (소형)",
  "5k-20k":   "5천~2만명 (핵심 타깃 — 구글 스니펫 팔로워 수로 1차 필터 가능)",
  "5k-50k":   "5천~5만명 (F&B 헤드라이너 기준 — 집객 엔진. 생과방·버터베이커리급 통과, 머드스콘 73K·장인한과 161K 제외)",
  "20k-100k": "2만~10만명 (대형)",
};

const POPUP_HINT: Record<string, string> = {
  "none": "팝업이력 없음 — 쿼리에 '팝업' 제외하고 오더메이드·직판 중심으로",
  "1-3":  "팝업이력 1~3회 — '팝업' 키워드 포함",
  "3+":   "팝업이력 3회 이상 — '팝업' + '플리마켓' 복수 키워드",
};

const OP_TYPE_HINT: Record<string, string> = {
  "all":    "이벤트·상설 모두",
  "event":  "이벤트(단기 팝업·행사) 위주 — '팝업' '마켓' 강조",
  "steady": "상설 입점 위주 — '쇼룸' '오더메이드' 강조",
};

interface DorkQuery { query: string; desc: string; tip: string; }

// ── Fallback: raw에서 site:instagram.com 줄 단위 추출 ──────────────────
function extractFromRaw(raw: string): DorkQuery[] {
  const results: DorkQuery[] = [];
  for (const line of raw.split("\n")) {
    const cleaned = line
      .trim()
      .replace(/^[0-9]+[.)]\s*/, "")   // "1. " "1) " 제거
      .replace(/^[-*•]\s*/, "")         // 불릿 제거
      .replace(/^"(.*)"$/, "$1")         // 앞뒤 따옴표 제거
      .trim();
    if (cleaned.startsWith("site:instagram.com") && cleaned.length > 25) {
      results.push({ query: cleaned, desc: "", tip: "" });
    }
  }
  return results.slice(0, 6);
}

// ── JSON 파싱 (허용 오류 보정 포함) ──────────────────────────────────────
function safeParseJson(jsonStr: string): DorkQuery[] | null {
  const attempts = [
    jsonStr,
    jsonStr.replace(/,(\s*[}\]])/g, "$1"),           // trailing comma
    jsonStr.replace(/(['"])?([a-zA-Z_]+)(['"])?\s*:/g, '"$2":'), // unquoted keys
  ];
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as unknown[];
      if (Array.isArray(parsed)) {
        return (parsed as DorkQuery[])
          .filter(q => q && typeof q === "object" && "query" in q)
          .map(q => ({
            query: String(q.query ?? "").trim(),
            desc:  String(q.desc  ?? "").trim(),
            tip:   String(q.tip   ?? "").trim(),
          }))
          .filter(q => q.query.startsWith("site:instagram.com"))
          .slice(0, 6);
      }
    } catch { /* try next */ }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      category?: string;
      op_type?: string;
      followers_range?: string;
      popup_history?: string;
      region?: string;
    };

    const category        = body.category        || "wellness";
    const op_type         = body.op_type          || "all";
    const followers_range = body.followers_range  || "5k-20k";
    const popup_history   = body.popup_history    || "1-3";
    const region          = body.region           || "서울";

    const catContext    = CAT_CONTEXT[category]       ?? category;
    const catExclude    = CAT_EXCLUDE[category]       ?? "-매거진 -대행";
    const coreKeyword   = CAT_CORE_KEYWORDS[category] ?? "팝업";
    const useSmartstore = USE_SMARTSTORE[category]    !== false;  // false면 false, 나머지 true
    const extraRules    = CAT_EXTRA_RULES[category]   ?? "";

    // 카테고리별 단일 패턴 라인 (템플릿 형식 — 실제 쿼리가 아님)
    const patternLine = useSmartstore
      ? `site:instagram.com 핵심어(따옴표1개) "스마트스토어" 지역어(따옴표없이) ${catExclude}`
      : `site:instagram.com 핵심어(따옴표1개) 운영형태(팝업OR마켓OR오더메이드) 지역어(따옴표없이) ${catExclude}`;

    const patternExample = useSmartstore
      ? `{"query":"site:instagram.com \\"${coreKeyword.split(" OR ")[0]}\\" \\"스마트스토어\\" 서울 OR 마포","desc":"설명","tip":"팁"}`
      : `{"query":"site:instagram.com \\"${coreKeyword.split(" OR ")[0]}\\" 팝업 서울 OR 마포","desc":"설명","tip":"팁"}`;

    const prompt = `당신은 팝업 공간 입점 브랜드를 구글 Dorking으로 발굴하는 전문가입니다.

[공간]
메자닌 북가좌 — 서울 서대문구 증산역, 복합문화공간 350평

[조건]
카테고리: ${catContext}
핵심 키워드 조합: ${coreKeyword}
운영 형태: ${OP_TYPE_HINT[op_type] ?? op_type}
팔로워: ${FOLLOWERS_HINT[followers_range] ?? followers_range}
팝업이력: ${POPUP_HINT[popup_history] ?? popup_history}
활동지역: ${region}

${extraRules}

[dorking 패턴]
${patternLine}

[규칙]
1. 따옴표("") 쿼리당 최대 2개. 3개 이상 = 구글 결과 0건.
2. 지역·수식어는 따옴표 없이: 서울 OR 마포 OR 서대문
3. "서울 서북권" 같은 합성 따옴표 금지
4. 각 쿼리는 반드시 site:instagram.com으로 시작
5. 브랜드명·계정명 생성 금지 — 쿼리 문자열만
6. 정확히 5개 생성

[출력 형식 — 이것만 출력, 다른 텍스트 금지]
JSON 배열 5개. 아래 형식 그대로:
[
  ${patternExample},
  {"query":"...","desc":"...","tip":"..."},
  {"query":"...","desc":"...","tip":"..."},
  {"query":"...","desc":"...","tip":"..."},
  {"query":"...","desc":"...","tip":"..."}
]`;

    const raw = await callClaude(prompt, 1200);

    // ── 1차: JSON 배열 추출 후 파싱 ──
    const jsonStr =
      raw.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)?.[1] ??
      raw.match(/(\[[\s\S]*\])/)?.[1];

    let queries: DorkQuery[] = [];

    if (jsonStr) {
      queries = safeParseJson(jsonStr) ?? [];
    }

    // ── 2차 fallback: queries가 0개이면 raw에서 줄 단위 추출 ──
    if (queries.length === 0) {
      queries = extractFromRaw(raw);
    }

    return NextResponse.json({ queries, total: queries.length, raw_len: raw.length });
  } catch (e) {
    const isRateLimit = String(e).includes("GEMINI_RATE_LIMIT");
    return NextResponse.json(
      { queries: [], error_type: isRateLimit ? "rate_limit" : "server_error" },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
