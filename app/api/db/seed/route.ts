import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const storeId = "demo-store-001";

    // 1. 기존 데모 스토어 삭제 후 재삽입 (Idempotent 보장)
    await db.execute({
      sql: "DELETE FROM sellfit_stores WHERE id = ?",
      args: [storeId]
    });
    await db.execute({
      sql: "INSERT INTO sellfit_stores (id, name, email, kakao) VALUES (?, ?, ?, ?)",
      args: [storeId, "데모 윈디 스토어", "demo@sellfit.kr", "01000000000"]
    });

    // 2. 기존 데모 상품 삭제 후 재삽입
    // 2. 기존 데모 상품 삭제 후 재삽입
    await db.execute({
      sql: "DELETE FROM sellfit_products WHERE store_id = ?",
      args: [storeId]
    });

    const seedProducts = [
      {
        id: "demo-p-001",
        name: "데모 이지백 압축팩 10L",
        url: "https://smartstore.naver.com/demo",
        keyword: "압축팩",
        category: "압축팩",
        price: 12900,
        is_own: 1,
        purchase_price: 3500,
        is_price_confirmed: 1,
        matrix_x: 32,
        matrix_y: 78
      },
      {
        id: "demo-p-002",
        name: "이지스토리 프리미엄 다리미판",
        url: "https://smartstore.naver.com/demo",
        keyword: "다리미판",
        category: "다리미판",
        price: 29800,
        is_own: 1,
        purchase_price: 6000,
        is_price_confirmed: 1,
        matrix_x: 72,
        matrix_y: 82
      },
      {
        id: "demo-p-003",
        name: "이지스토리 감성 도자기 화분",
        url: "https://smartstore.naver.com/demo",
        keyword: "화분",
        category: "화분",
        price: 18500,
        is_own: 1,
        purchase_price: 9500,
        is_price_confirmed: 1,
        matrix_x: 22,
        matrix_y: 28
      },
      {
        id: "demo-p-004",
        name: "이지스토리 두꺼운 유아매트",
        url: "https://smartstore.naver.com/demo",
        keyword: "유아매트",
        category: "유아매트",
        price: 89000,
        is_own: 1,
        purchase_price: 52000,
        is_price_confirmed: 1,
        matrix_x: 82,
        matrix_y: 18
      },
      {
        id: "demo-p-005",
        name: "경쟁사 파워 압축팩",
        url: "https://smartstore.naver.com/comp",
        keyword: "압축팩",
        category: "압축팩",
        price: 11500,
        is_own: 0,
        purchase_price: 0,
        is_price_confirmed: 0,
        matrix_x: 36,
        matrix_y: 32
      },
      {
        id: "demo-p-006",
        name: "[후보] 휴대용 미니 건조기",
        url: "https://smartstore.naver.com/demo",
        keyword: "건조기",
        category: "가전",
        price: 149000,
        is_own: 2,
        purchase_price: 45000,
        is_price_confirmed: 0,
        matrix_x: 86,
        matrix_y: 70
      },
      {
        id: "demo-p-007",
        name: "[후보] 자동 급수 스마트 화분",
        url: "https://smartstore.naver.com/demo",
        keyword: "화분",
        category: "화분",
        price: 24000,
        is_own: 2,
        purchase_price: 16000,
        is_price_confirmed: 0,
        matrix_x: 18,
        matrix_y: 22
      },
      {
        id: "demo-p-008",
        name: "[후보] 초경량 접이식 다리미판",
        url: "https://smartstore.naver.com/demo",
        keyword: "다리미판",
        category: "다리미판",
        price: 34000,
        is_own: 2,
        purchase_price: 24000,
        is_price_confirmed: 0,
        matrix_x: 66,
        matrix_y: 38
      }
    ];

    for (const p of seedProducts) {
      await db.execute({
        sql: `INSERT INTO sellfit_products 
              (id, store_id, name, url, keyword, category, price, is_own, purchase_price, is_price_confirmed, matrix_x, matrix_y) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          storeId,
          p.name,
          p.url,
          p.keyword,
          p.category,
          p.price,
          p.is_own,
          p.purchase_price,
          p.is_price_confirmed,
          p.matrix_x,
          p.matrix_y
        ]
      });
    }

    // 3. 데모 데일리 메트릭스 적재
    const pIds = seedProducts.map(p => p.id);
    await db.execute({
      sql: `DELETE FROM sellfit_daily_metrics WHERE product_id IN (${pIds.map(() => "?").join(", ")})`,
      args: pIds
    });

    for (let i = 0; i < seedProducts.length; i++) {
      const p = seedProducts[i];
      await db.execute({
        sql: `INSERT INTO sellfit_daily_metrics (id, product_id, price, review_count, rating, search_volume, cpc, competitors) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`demo-m-${i + 1}`, p.id, p.price, 120 + i * 20, 4.5 + (i % 5) * 0.1, 12500, 320, 4500]
      });
    }

    // 4. 모의 데일리 진단 결과 적재
    await db.execute({
      sql: "DELETE FROM sellfit_daily_reports WHERE store_id = ? AND report_date = ?",
      args: [storeId, today]
    });

    const reportId = "demo-rep-001";
    const riskScore = 85; // 다소 높음 표시

    // 모의 full_analysis
    const mockFullAnalysis = [
      {
        product: "데모 이지백 압축팩 10L",
        category: "압축팩",
        analysis: {
          diagnosis_summary: "경쟁사 대비 장당 단가가 12% 높아 단품 저항 발생 중. SEO 밸브식 속성 누락으로 탐색 노출 15% 손실.",
          price_analysis: {
            finding: "자사 장당 단가 1,290원 vs 경쟁사 1,150원",
            comparison: "+12.1%",
            action: "밸브식 4장 묶음 구성을 신설하여 번들당 장당 단가를 1,080원으로 낮추어 단가 우위를 점할 것을 제안합니다.",
            copy_target_tab: "price"
          },
          seo_miss: {
            missing_attributes: ["밸브식", "이중밀폐", "PE강화필름"],
            recommended_names: [
              "이지백 밸브식 이중밀폐 압축팩 10L 이불용 패딩 옷 보관백",
              "이지백 강밀폐 밸브식 이불 압축팩 대용량 옷 정리 정리팩"
            ],
            copy_target_tab: "seo"
          },
          hooking_copy: [
            "두꺼운 겨울 이불이 0.12mm로 줄어드는 마법, 2중 밸브 밀폐 보장",
            "한 번 압축하면 다음 계절까지 절대 되부풀지 않는 이중 밸브백"
          ],
          review_defense: [
            {
              negative_keyword: "부풀음",
              defense_copy: "2중 스크류 밸브식 잠금 설계로 공기 투입을 원천 차단하여 부풀음 현상을 100% 방지합니다."
            }
          ],
          priority_routing: {
            first: {
              issue: "SEO 노출용 '밸브식' 속성 키워드가 상품명에서 전면 누락되어 유입 손실 발생 중",
              score: 95,
              target_tab: "seo",
              context_payload: { keyword: "압축팩" }
            },
            second: {
              issue: "경쟁사 대비 장당 절대 단가가 140원 높아 장바구니 전환 허들 발생",
              score: 82,
              target_tab: "price",
              context_payload: {}
            }
          }
        }
      }
    ];

    const summaryStr = "경쟁사 대비 장당 단가가 12% 높아 단품 저항 발생 중. SEO 밸브식 속성 누락으로 탐색 노출 15% 손실.";

    await db.execute({
      sql: `INSERT INTO sellfit_daily_reports 
            (id, store_id, report_date, risk_score, summary, 
             recommended_title_1, recommended_title_2, recommended_title_3, 
             hooking_copy, review_rebuttal, status, defended_amount, actions_completed, full_analysis) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', 0, 0, ?)`,
      args: [
        reportId,
        storeId,
        today,
        riskScore,
        JSON.stringify({ brief: summaryStr, full: mockFullAnalysis }),
        mockFullAnalysis[0].analysis.seo_miss.recommended_names[0],
        mockFullAnalysis[0].analysis.seo_miss.recommended_names[1],
        "",
        mockFullAnalysis[0].analysis.hooking_copy[0],
        mockFullAnalysis[0].analysis.review_defense[0].defense_copy,
        JSON.stringify(mockFullAnalysis),
      ]
    });

    // 5. 최근 7일 모의 히스토리도 적재 (이력 그래프가 예쁘게 나오도록)
    // 과거 2일분 리포트 추가 적재
    const d1 = new Date(Date.now() + 9 * 3600000 - 1 * 24 * 3600000).toISOString().slice(0, 10);
    const d2 = new Date(Date.now() + 9 * 3600000 - 2 * 24 * 3600000).toISOString().slice(0, 10);

    await db.execute({
      sql: "DELETE FROM sellfit_daily_reports WHERE store_id = ? AND report_date IN (?, ?)",
      args: [storeId, d1, d2]
    });

    await db.execute({
      sql: `INSERT INTO sellfit_daily_reports (id, store_id, report_date, risk_score, summary, defended_amount, actions_completed, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ready')`,
      args: ["demo-rep-old1", storeId, d1, 65, JSON.stringify({ brief: "가격 및 썸네일 진입 완료", full: [] }), 2500, 1]
    });

    await db.execute({
      sql: `INSERT INTO sellfit_daily_reports (id, store_id, report_date, risk_score, summary, defended_amount, actions_completed, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ready')`,
      args: ["demo-rep-old2", storeId, d2, 45, JSON.stringify({ brief: "초기 마이그레이션 및 SEO 보강", full: [] }), 1200, 1]
    });

    return NextResponse.json({ ok: true, message: "데모 데이터 Seeding 완료" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
