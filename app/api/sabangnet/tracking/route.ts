// ─────────────────────────────────────────────────────────────────────
// 사방넷 운송장 재업로드 API
// Phase 2 POST — Phase 1 세트분리·운송장매핑 결과 → 사방넷 자동 반영
// 입력: TrackingMapping[] (Phase 1 출력 그대로 body에 전달)
// ─────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { sabangnetPost, checkSabangnetConfig, SabangnetError } from "@/lib/sabangnet/client";
import type {
  TrackingMapping,
  SabangnetTrackingItem,
  SabangnetTrackingResponse,
} from "@/lib/sabangnet/types";

export async function POST(req: NextRequest) {
  // 환경변수 프리플라이트
  const config = checkSabangnetConfig();
  if (!config.ok) {
    return NextResponse.json(
      { error: "사방넷 API 키 미설정", missing: config.missing },
      { status: 503 }
    );
  }

  let body: { items: TrackingMapping[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식 오류: JSON 파싱 실패" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items 배열이 비어있습니다" }, { status: 400 });
  }

  // Phase 1 연결 지점: TrackingMapping → 사방넷 운송장 등록 payload 변환
  const trackingItems: SabangnetTrackingItem[] = body.items.map(
    (item: TrackingMapping) => ({
      ord_no: item.orderNo,
      invoice_no: item.trackingNo,
      courier_code: item.courierCode,
      send_date: item.invoiceDate,
    })
  );

  try {
    // TODO: 실제 사방넷 운송장 등록 함수명·파라미터 확인 필요 (가이드 참조)
    const response = await sabangnetPost<SabangnetTrackingResponse>(
      "tracking", // TODO: 실제 엔드포인트 경로 확인
      {
        mode: "UPLOAD_INVOICE",  // TODO: 실제 mode 값 확인
        invoices: trackingItems,
      }
    );

    return NextResponse.json({
      success: true,
      success_count: response.success_count,
      fail_count: response.fail_count,
      fail_orders: response.fail_orders ?? [],
      message: `운송장 ${response.success_count}건 등록 완료, 실패 ${response.fail_count}건`,
    });
  } catch (err) {
    if (err instanceof SabangnetError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[sabangnet/tracking]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
