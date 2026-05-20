export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const CRON_SECRET = process.env.CRON_SECRET;

// ── Gemini JSON 강제 호출 ──────────────────────────────────
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

async function callGeminiJSON(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      maxOutputTokens: 4000,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(GEMINI_URL(apiKey), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      return JSON.parse(text);
    } catch {
      if (attempt === 1) return {};
    }
  }
  return {};
}

// ── 마스터 프롬프트 ───────────────────────────────────────
const MASTER_PROMPT = `# SELLFIT MASTER PROMPT — Category Expert MD

## ROLE
당신은 한국 네이버 스마트스토어에서 7년간 활동한 살림·리빙·육아 카테고리 전문 MD다. 연 매출 50억을 직접 달성했고, 상품의 1등과 10등의 차이를 0.1초 안에 짚어낸다.
당신은 "셀러의 인하우스 AI 마케팅 팀원"이다. 월 200만원짜리 마케팅 대행사 직원 한 명을 대체하는 자리에 서있다.

## CORE PRINCIPLES (절대 규칙)
1. 일반론 절대 금지: "사회적 증거가 부족합니다" "가격 경쟁력이 떨어집니다" "리뷰를 더 받으세요" "이벤트를 진행하세요" — 즉시 폐기
2. 데이터 팩트만 타격: 구체 숫자·키워드·속성 박혀야 한다
3. 복사 가능한 결과물 강제: 셀러가 [복사] 버튼 한 번으로 스마트스토어 센터에 붙여넣을 수 있어야 한다
4. 카테고리 맞춤 톤 강제: 첨부된 카테고리 플레이북을 따른다. 압축팩 로직으로 다리미판 분석 = 즉시 폐기
5. 시계열 맥락 반영: 과거 진단 이력이 있으면 "셀러가 어제 한 작업의 다음 단계" 톤으로

## TONE GUIDANCE
- 까칠하지만 적대적이지 X. 셀러를 동료로 대함
- "~하세요"보다 "~합니다" 톤 (단정)
- 위로 X. 분석 X. 처방.

## OUTPUT FORMAT (JSON 강제)
반드시 다음 구조로 출력:
{
  "diagnosis_summary": "(한 줄 요약 — 가장 시급한 자리 + 임팩트 추정)",
  "price_analysis": {
    "finding": "(카테고리별 단가 분석 — 구체 숫자)",
    "comparison": "(카테고리 평균 대비 +N% 또는 -N%)",
    "action": "(즉시 실행 가능한 가격 조정 방안)",
    "copy_target_tab": "price"
  },
  "seo_miss": {
    "missing_attributes": ["누락 속성 키워드"],
    "recommended_names": ["추천 상품명1 (50자 이내)", "추천 상품명2", "추천 상품명3"],
    "copy_target_tab": "seo"
  },
  "hooking_copy": ["후킹 카피1 (30자 이내)", "카피2", "카피3"],
  "review_defense": [
    { "negative_keyword": "부정 키워드", "defense_copy": "방어 카피" }
  ],
  "priority_routing": {
    "first": { "issue": "가장 시급한 자리", "score": 95, "target_tab": "price|seo|ad|customer", "context_payload": {} },
    "second": { "issue": "", "score": 80, "target_tab": "", "context_payload": {} },
    "third": { "issue": "", "score": 60, "target_tab": "", "context_payload": {} }
  }
}`;

// ── 카테고리 플레이북 ─────────────────────────────────────
const PLAYBOOKS: Record<string, string> = {
  "압축팩": `## 압축팩 카테고리 플레이북
CATEGORY ESSENCE: "이불·옷을 얼마나 작게 + 얼마나 오래 + 얼마나 편하게 보관할 수 있는가"
VALUE DRIVERS: 1)내구성(밸브 공기차단·필름두께·재사용횟수) 2)편리성(자동펌프·롤업식) 3)가성비(장당단가=판매가÷매수) 4)용도명확성(이불용/의류용/여행용)
SEO 속성: 밸브식/평면형/클립식/롤업식, 소형/중형/대형/특대, 이불용/의류용/여행용/패딩전용, 0.12mm이상, 재사용가능
시즌: 피크1=3~5월(봄환절기), 피크2=9~10월(가을정리), 비시즌여름=여행용키워드
가격기준: 소형장당800~1400원, 중형1200~2000원, 대형1800~3500원
부정리뷰방어: 찢어짐→"0.12mm강화필름·찢어지면100%환불", 밸브약함→"2중밸브차단·30일압축유지보장", 다시부풀음→"공기100%차단테스트영상", 냄새→"무독성PE재질·KC인증완료"
금지: 장당단가계산없이절대가격만진단, 용도미명시방치`,

  "다리미판": `## 다리미판 카테고리 플레이북
CATEGORY ESSENCE: "얼마나 안정적이고 + 얼마나 인테리어에 어울리고 + 얼마나 공간 효율적인가"
특징: 단가높음(2만~10만원대), 가성비보다 신뢰·안정성·디자인이 결정
VALUE DRIVERS: 1)안정성(다리두께·최대하중·고정잠금) 2)인테리어핏(화이트/우드/블랙) 3)공간효율(접이식/컴팩트) 4)다림질효율(와이드·높이조절·스팀호환)
SEO 속성: 스탠드형/탁상형/미니형/벽걸이형, 소형/중형/대형, 메탈/우드/플라스틱, 접이식/높이조절/스팀호환/와이드, 화이트/우드/블랙
시즌: 피크1=3~5월(이사철), 피크2=9~10월(결혼시즌), 연중안정(비시즌도매출유지)
가격기준: 탁상형1.5만~3만원, 스탠드중형3만~6만원, 스탠드대형우드7만~15만원
부정리뷰방어: 흔들림→"다리두께25mm·최대15kg하중테스트", 가벼움→"본체4.2kg·논슬립고무패드4개", 다림판작음→"와이드형100×40cm"
금지: "가격을낮추세요"(다리미판=가격경쟁X), 압축팩로직적용`,

  "유아매트": `## 유아매트 카테고리 플레이북
CATEGORY ESSENCE: "얼마나 안전하고 + 얼마나 두껍고 + 얼마나 청소가 쉬운가"
특징: 구매자=부모(사용자=아기), 안전인증=진입자격, 부정리뷰=매출직격탄
VALUE DRIVERS: 1)안전성(KC인증·무독성·환경호르몬ZERO) 2)두께(20mm이상·층간소음차단) 3)청소관리(물청소·방수·항균) 4)평당단가(총가격X·평당환산필수)
SEO 속성: 폴더매트/롤매트/퍼즐매트, 10mm이하/10~20mm/20~40mm/40mm이상, PE폼/EVA/PU/TPU/XPE, KC인증/CE인증, 항균/방수/무독성/접이식
시즌: 피크1=3~5월(출산·이사), 피크2=8~10월(가을출산)
가격기준: 폴더매트200×140평당10만~18만원, 롤매트평당8만~15만원, 퍼즐매트평당5만~10만원
부정리뷰방어: 냄새→"KC환경호르몬ZERO·무독성PE폼", 얇음→"두께40mm·층간소음50dB차단", 오염→"방수코팅·물청소·항균처리"
우선순위: 1위=안전인증누락, 2위=부정리뷰방어, 3위=SEO, 4위=가격
금지: 절대가격진단(평당환산필수), "가격낮추세요"(안전·두께가결정)
SAFETY_CHECK 필수: KC인증 키워드 상품명 미포함 시 우선순위1번강제`,

  "화분": `## 화분 카테고리 플레이북 (⚠️ 초안 — 전문가 검증 필요)
CATEGORY ESSENCE: "얼마나 인테리어와 어울리고 + 얼마나 식물이 잘 자라고 + 얼마나 후기·이미지 신뢰가 쌓였는가"
특징: 이미지가텍스트보다강함(썸네일=클릭율결정), 감성·인테리어핏>가성비
VALUE DRIVERS: 1)인테리어핏(모던/우드/미드센추리/내추럴) 2)식물친화성(배수홀·통기성) 3)사이즈매칭(식물종류별추천) 4)후기수(화분=후기수매출직결)
SEO 속성: 도자기/플라스틱/콘크리트/금속/우드/라탄, 소형/중형/대형/특대, 실내용/실외용, 다육이용/관엽용/허브용, 모던/빈티지/미드센추리, 배수홀/받침일체형
시즌: 피크1=3~5월(식목일·봄), 피크2=9~10월(가을인테리어), 12월=선물
우선순위: 1위=후기수, 2위=썸네일이미지, 3위=SEO, 4위=가격
부정리뷰방어: 배수홀없음→"배수홀4개·식물통풍보장", 깨짐→"고강도도자기·파손100%교환", 색상다름→"실사촬영·자연광환경"
THUMBNAIL_ANALYSIS 필수: 스튜디오vs누끼컷vs실생활컷, 톤앤매너일관성, 식물+화분함께촬영여부
금지: "가격낮추세요", 텍스트분석만(이미지핵심), 타카테고리로직적용`,
};

// ── 특수 카테고리 추가 출력 스키마 ──────────────────────
function getExtraOutputSchema(category: string): string {
  if (category === "화분") {
    return `
"thumbnail_analysis": {
  "current_type": "스튜디오촬영|누끼컷|실생활컷|알수없음",
  "tone_consistency": "일관됨|불일관",
  "has_plant_with_pot": true|false,
  "has_size_comparison": true|false,
  "action": "(썸네일 개선 액션)"
},`;
  }
  if (category === "유아매트") {
    return `
"safety_check": {
  "kc_in_name": true|false,
  "non_toxic_in_name": true|false,
  "safety_priority_forced": true|false,
  "action": "(안전 인증 관련 즉시 액션)"
},`;
  }
  return "";
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const stores = (await db.execute("SELECT * FROM sellfit_stores")).rows;
  const results = [];

  for (const store of stores) {
    const storeId = String(store.id);

    // 오늘 이미 생성됐으면 skip
    const existing = await db.execute({
      sql: "SELECT id FROM sellfit_daily_reports WHERE store_id = ? AND report_date = ?",
      args: [storeId, today],
    });
    if (existing.rows.length > 0) continue;

    // 자사·경쟁사 상품 + 최근 지표 조회
    const metricsResult = await db.execute({
      sql: `SELECT p.id, p.name, p.keyword, p.category, p.price, p.is_own,
                   m.search_volume, m.cpc, m.competitors, m.review_count, m.collected_at
            FROM sellfit_products p
            LEFT JOIN (
              SELECT product_id, search_volume, cpc, competitors, review_count, collected_at
              FROM sellfit_daily_metrics
              WHERE id IN (SELECT id FROM sellfit_daily_metrics GROUP BY product_id ORDER BY collected_at DESC)
            ) m ON m.product_id = p.id
            WHERE p.store_id = ?`,
      args: [storeId],
    });

    const ownProducts = metricsResult.rows.filter(r => Number(r.is_own) === 1);
    const compProducts = metricsResult.rows.filter(r => Number(r.is_own) === 0);
    if (ownProducts.length === 0) continue;

    // 과거 이력 조회 (Paperclip 시계열)
    const historyResult = await db.execute({
      sql: "SELECT report_date, summary, status FROM sellfit_daily_reports WHERE store_id = ? ORDER BY report_date DESC LIMIT 5",
      args: [storeId],
    });
    const history = historyResult.rows;

    // 카테고리별 분석 (상품별로)
    const reportParts: Record<string, unknown>[] = [];

    for (const p of ownProducts) {
      const category = String(p.category || "압축팩");
      const playbook = PLAYBOOKS[category] || PLAYBOOKS["압축팩"];
      const extraSchema = getExtraOutputSchema(category);

      const comp = compProducts.find(c => c.category === p.category);

      // 시스템 프롬프트 = 마스터 + 플레이북
      const systemPrompt = MASTER_PROMPT + "\n\n" + playbook;

      // 유저 프롬프트 = INPUT DATA
      const inputData = {
        product: {
          name: String(p.name),
          category,
          price: p.price ? Number(p.price) : null,
          review_count: p.review_count ? Number(p.review_count) : null,
          keywords: [String(p.keyword)],
        },
        competitor: comp ? {
          name: String(comp.name),
          price: comp.price ? Number(comp.price) : null,
          review_count: comp.review_count ? Number(comp.review_count) : null,
        } : null,
        datalab: {
          trend_3m: p.search_volume ? Number(p.search_volume) : 0,
          related_keywords: [String(p.keyword)],
        },
        shopping_api: {
          competing_products_count: p.competitors ? Number(p.competitors) : 0,
        },
        history: history.map(h => ({
          date: String(h.report_date),
          summary: String(h.summary || ""),
        })),
        today,
      };

      const extraNote = extraSchema
        ? `\n\n⚠️ 이 카테고리(${category})는 OUTPUT JSON에 다음 필드도 추가 필수:\n${extraSchema}`
        : "";

      const userPrompt = `다음 상품을 분석하고 OUTPUT FORMAT STRICT에 따라 JSON으로만 응답하세요.${extraNote}\n\n${JSON.stringify(inputData, null, 2)}`;

      const result = await callGeminiJSON(systemPrompt, userPrompt);
      reportParts.push({ product: String(p.name), category, analysis: result });
    }

    // 대표 요약 (첫 번째 자사 상품 기준)
    const primary = reportParts[0]?.analysis as Record<string, unknown> | undefined;
    const summary = (primary?.diagnosis_summary as string) || "";
    const seoMiss = primary?.seo_miss as { recommended_names?: string[] } | undefined;
    const hookingCopy = primary?.hooking_copy as string[] | undefined;
    const reviewDefense = primary?.review_defense as { defense_copy?: string }[] | undefined;

    // 위험 점수 계산
    const firstProduct = ownProducts[0];
    const riskScore = !firstProduct?.review_count ? 80 :
      Number(firstProduct.search_volume) < 30 ? 70 : 40;

    const reportId = randomUUID();
    await db.execute({
      sql: `INSERT INTO sellfit_daily_reports
            (id, store_id, report_date, risk_score, summary,
             recommended_title_1, recommended_title_2, recommended_title_3,
             hooking_copy, review_rebuttal, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`,
      args: [
        reportId, storeId, today, riskScore,
        summary,
        seoMiss?.recommended_names?.[0] || "",
        seoMiss?.recommended_names?.[1] || "",
        seoMiss?.recommended_names?.[2] || "",
        hookingCopy?.[0] || "",
        reviewDefense?.[0]?.defense_copy || "",
      ],
    });

    // 전체 분석 결과를 별도 저장 (나중에 UI에서 사용)
    await db.execute({
      sql: `UPDATE sellfit_daily_reports SET summary = ? WHERE id = ?`,
      args: [JSON.stringify({ brief: summary, full: reportParts }), reportId],
    });

    results.push({
      store: String(store.name),
      report_id: reportId,
      risk_score: riskScore,
      products_analyzed: reportParts.length,
    });
  }

  return NextResponse.json({ ok: true, ran_at: new Date().toISOString(), results });
}
