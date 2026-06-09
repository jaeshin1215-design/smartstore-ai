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

// 카테고리별 노이즈 제거 연산자
const CAT_EXCLUDE: Record<string, string> = {
  performance: "-공연장 -학원 -대행사 -기획사",
  bakery_fb:   "-프랜차이즈 -매거진 -대행 -카페체인",
  wellness:    "-병원 -의원 -의료기기 -대행",
  outdoor:     "-브랜드공식 -대리점 -수입사",
  fashion:     "-허브 -센터 -백화점 -페어 -매거진",
  ip_content:  "-출판사 -방송국 -대행사 -기획사",
  beauty:      "-허브 -센터 -백화점 -페어 -병원",
};

const FOLLOWERS_HINT: Record<string, string> = {
  "1k-5k":    "1천~5천명 (소형)",
  "5k-20k":   "5천~2만명 (핵심 타깃 — 구글 스니펫 팔로워 수로 1차 필터 가능)",
  "20k-100k": "2만~10만명 (대형)",
};

const POPUP_HINT: Record<string, string> = {
  "none": "팝업이력 없음 — 쿼리에 '팝업' 제외하고 '스마트스토어' 중심으로",
  "1-3":  "팝업이력 1~3회 — '팝업' 키워드 포함",
  "3+":   "팝업이력 3회 이상 — '팝업' + '플리마켓' 복수 키워드",
};

const OP_TYPE_HINT: Record<string, string> = {
  "all":    "이벤트·상설 모두",
  "event":  "이벤트(단기 팝업·행사) 위주 — '팝업' '마켓' 강조",
  "steady": "상설 입점 위주 — '스마트스토어' '쇼룸' 강조",
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      category?: string;
      op_type?: string;
      followers_range?: string;
      popup_history?: string;
      region?: string;
    };

    const category       = body.category        || "wellness";
    const op_type        = body.op_type          || "all";
    const followers_range = body.followers_range || "5k-20k";
    const popup_history  = body.popup_history    || "1-3";
    const region         = body.region           || "서울";

    const catContext = CAT_CONTEXT[category] ?? category;
    const catExclude = CAT_EXCLUDE[category] ?? "-매거진 -대행";

    const prompt = `당신은 팝업 공간 입점 브랜드를 구글 Dorking으로 발굴하는 전문가입니다.
아래 조건에 맞는 Google 검색식(dorking query)을 3~5개 생성하세요.

[공간]
메자닌 북가좌 — 서울 서대문구 증산역, 복합문화공간 350평
실증 사례: 빵력장터(F&B), 라이콘 오디션(공연·굿즈), MOVFLEX(웰니스)

[조건]
카테고리: ${catContext}
운영 형태: ${OP_TYPE_HINT[op_type] ?? op_type}
팔로워: ${FOLLOWERS_HINT[followers_range] ?? followers_range}
팝업이력: ${POPUP_HINT[popup_history] ?? popup_history}
활동지역: ${region}

[핵심 dorking 패턴]
site:instagram.com "키워드1" "키워드2" "스마트스토어" ${catExclude}

[규칙]
- 계정명·브랜드명을 생성하지 말 것. 검색식(쿼리 문자열)만 출력.
- 각 쿼리는 site:instagram.com으로 시작.
- "스마트스토어" 포함 = D2C 판매 증거.
- 팔로워 필터는 쿼리에 직접 넣을 수 없으니, 구글 스니펫 팔로워 수로 사람이 1차 필터 한다는 힌트를 설명에 넣어라.
- 각 쿼리에 한 줄 설명 추가 (왜 이 쿼리인지).

JSON 배열만 출력:
[
  {
    "query": "site:instagram.com ... 전체 검색식",
    "desc": "이 쿼리가 잡는 브랜드 유형 1문장",
    "tip": "구글 결과에서 팔로워·팝업이력 확인 방법 1줄"
  }
]`;

    const raw = await callClaude(prompt, 1200, false);

    const jsonStr =
      raw.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)?.[1] ??
      raw.match(/(\[[\s\S]*\])/)?.[1];

    if (!jsonStr) {
      return NextResponse.json({ queries: [], raw: raw.slice(0, 800) });
    }

    interface DorkQuery { query: string; desc: string; tip: string; }
    let queries: DorkQuery[] = [];
    try {
      const parsed = JSON.parse(jsonStr) as DorkQuery[];
      queries = parsed
        .filter(q => q.query && q.query.includes("site:instagram.com"))
        .map(q => ({
          query: String(q.query).trim(),
          desc:  String(q.desc  || "").trim(),
          tip:   String(q.tip   || "").trim(),
        }))
        .slice(0, 6);
    } catch {
      return NextResponse.json({ queries: [], error: "JSON 파싱 실패", raw: raw.slice(0, 800) });
    }

    return NextResponse.json({ queries, total: queries.length });
  } catch (e) {
    return NextResponse.json({ queries: [], error: String(e) }, { status: 500 });
  }
}
