import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const storeId = "mezzanine-demo-001";

    await db.execute({ sql: "DELETE FROM sellfit_stores WHERE id = ?", args: [storeId] });
    await db.execute({
      sql: "INSERT INTO sellfit_stores (id, name, email, kakao) VALUES (?, ?, ?, ?)",
      args: [storeId, "메자닌 북가좌", "demo@mezzanine.kr", ""],
    });

    await db.execute({ sql: "DELETE FROM sellfit_products WHERE store_id = ?", args: [storeId] });

    // is_own=1: ★ 공간 이력(실증 / filled circle)
    // is_own=2: ○ 엔진 후보(미접촉 / hollow circle)
    // keyword 필드 = 브랜드 한 줄 설명, price/purchase_price = 0 (메자닌 무관)
    const brands = [
      {
        id: "mz-001",
        name: "봄날엔",
        keyword: "빵력장터 행사 참여 (2026.05)",
        category: "베이커리·마켓",
        is_own: 1,      // ★ 이력
        matrix_x: 38,
        matrix_y: 82,
      },
      {
        id: "mz-002",
        name: "MOVFLEX",
        keyword: "1유로프로젝트 북가좌 팝업 진행 (2024.12)",
        category: "라이프스타일",
        is_own: 1,      // ★ 이력
        matrix_x: 78,
        matrix_y: 40,
      },
      {
        id: "mz-003",
        name: "[웰니스·아로마 후보]",
        keyword: "최근 6개월 플리마켓 이력·서북권 밀착 아로마/인센스",
        category: "웰니스",
        is_own: 2,      // ○ 엔진 후보
        matrix_x: 80,
        matrix_y: 44,
      },
      {
        id: "mz-004",
        name: "[바디케어 D2C 후보]",
        keyword: "성수 검증·팔로워 1만대·오프라인 쇼룸 없음",
        category: "바디케어",
        is_own: 2,
        matrix_x: 72,
        matrix_y: 36,
      },
      {
        id: "mz-005",
        name: "[감성 소품·인센스 후보]",
        keyword: "인증샷 화제성↑·콜라보 마켓 참여 잦음",
        category: "감성 소품",
        is_own: 2,
        matrix_x: 66,
        matrix_y: 48,
      },
      {
        id: "mz-006",
        name: "[로컬 아티스트 굿즈 후보]",
        keyword: "지역 팬덤 보유·반나절 설치 — 화제성 확실 시",
        category: "아트·굿즈",
        is_own: 2,
        matrix_x: 75,
        matrix_y: 70,
      },
      {
        id: "mz-007",
        name: "[신인 로컬 레이블 후보]",
        keyword: "미검증 신인·잠재 화제성",
        category: "뮤직·레이블",
        is_own: 2,
        matrix_x: 34,
        matrix_y: 30,
      },
    ];

    for (const b of brands) {
      await db.execute({
        sql: `INSERT INTO sellfit_products
              (id, store_id, name, url, keyword, category, price, is_own, purchase_price, is_price_confirmed, matrix_x, matrix_y)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [b.id, storeId, b.name, "", b.keyword, b.category, 0, b.is_own, 0, 0, b.matrix_x, b.matrix_y],
      });
    }

    return NextResponse.json({ ok: true, message: "메자닌 브랜드 7개 seed 완료" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
