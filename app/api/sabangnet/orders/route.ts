// ─────────────────────────────────────────────────────────────────────
// 사방넷 발주 취합 API
// Phase 2 GET — 사방넷 전채널 주문 수집 → Phase 1 OrderRow 형식으로 매핑
// 실제 호출: SABANGNET_API_KEY 환경변수 설정 후 활성화
// ─────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { sabangnetPost, checkSabangnetConfig, SabangnetError } from "@/lib/sabangnet/client";
import type {
  SabangnetOrder,
  SabangnetOrdersResponse,
  OrderRow,
} from "@/lib/sabangnet/types";

/** 사방넷 주문 한 건 → Phase 1 OrderRow 형식으로 변환 */
function mapToOrderRow(order: SabangnetOrder): OrderRow {
  return {
    // ── 원본 식별자 ──
    orderNo: order.ord_no,
    channel: order.ord_channel,
    orderedAt: order.ord_date,

    // ── 상품 정보 ──
    productName: order.prod_name,
    optionName: order.opt_name,
    quantity: order.qty,

    // ── 수령인 정보 ──
    receiverName: order.recv_name,
    phone: order.recv_phone.replace(/-/g, ""),
    address: order.recv_addr,
    addressDetail: order.recv_addr_detail,
    zipCode: order.recv_zipcode,
    memo: order.delivery_memo,

    // ── 35열 추가 필드 (Phase 1 세트분리·규격 산정 결과로 채워짐) ──
    // TODO: Phase 1 변환 로직 완성 후 아래 기본값 교체
    boxSize: "",      // Phase 1에서 채움
    weight: 0,        // Phase 1에서 채움
    setCode: "",      // Phase 1 세트분리 결과
    isSetItem: false, // Phase 1 세트분리 결과
  };
}

export async function GET(req: NextRequest) {
  // 환경변수 프리플라이트
  const config = checkSabangnetConfig();
  if (!config.ok) {
    return NextResponse.json(
      { error: "사방넷 API 키 미설정", missing: config.missing },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("from") ?? getTodayStr();
  const toDate = searchParams.get("to") ?? getTodayStr();

  // 사방넷 연동 채널 필터 — 수기채널은 제외 (심유나 프로 확정 범위)
  const channelFilter = searchParams.get("channels")?.split(",") ?? [];

  try {
    // TODO: 실제 사방넷 주문 조회 함수명·파라미터 확인 필요 (가이드 참조)
    const response = await sabangnetPost<SabangnetOrdersResponse>(
      "orders",  // TODO: 실제 엔드포인트 경로 확인
      {
        mode: "GET_ORDER_LIST",  // TODO: 실제 mode 값 확인
        from_date: fromDate,
        to_date: toDate,
        ord_status: "결제완료",  // TODO: 실제 상태값 확인
        page: 1,
        per_page: 200,
      }
    );

    let orders = response.orders ?? [];

    // 채널 필터 적용 (파라미터 없으면 전채널)
    if (channelFilter.length > 0) {
      orders = orders.filter((o) => channelFilter.includes(o.ord_channel));
    }

    // Phase 1 연결 지점: 사방넷 원본 → OrderRow 형식 변환
    const orderRows: OrderRow[] = orders.map(mapToOrderRow);

    return NextResponse.json({
      total: orderRows.length,
      from: fromDate,
      to: toDate,
      // Phase 1 입력으로 넘길 데이터
      orders: orderRows,
      // Phase 1 처리 전 원본도 병행 제공 (디버깅용)
      _raw_count: response.total_count,
    });
  } catch (err) {
    if (err instanceof SabangnetError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[sabangnet/orders]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
