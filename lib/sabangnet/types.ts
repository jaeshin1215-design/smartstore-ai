// ─────────────────────────────────────────────────────────────────────
// Phase 1 인터페이스 — Phase 2 연결 지점
// Phase 1(발주서 처리)이 완성되면 이 타입을 그대로 사용.
// "21열" = 사방넷 주문 원본 컬럼 수, "35열" = 택배프로그램 입력 컬럼 수
// ─────────────────────────────────────────────────────────────────────

/** Phase 1 출력 ① — 21열 원본을 35열 택배 형식으로 변환한 발주 행 */
export interface OrderRow {
  // ── 원본 식별자 (21열 기준) ──
  orderNo: string;        // 주문번호 (사방넷 ord_no)
  channel: string;        // 판매채널 (스마트스토어·쿠팡 등)
  orderedAt: string;      // 주문일시 (YYYYMMDD)

  // ── 상품 정보 ──
  productName: string;    // 상품명
  optionName: string;     // 옵션명
  quantity: number;       // 수량

  // ── 수령인 정보 ──
  receiverName: string;   // 수령인
  phone: string;          // 연락처 (하이픈 제거)
  address: string;        // 주소 (기본)
  addressDetail: string;  // 주소 (상세)
  zipCode: string;        // 우편번호
  memo: string;           // 배송메모

  // ── 35열 추가 컬럼 (택배프로그램 전용) ──
  boxSize: string;        // 박스 규격 (예: 소·중·대)
  weight: number;         // 중량(kg)
  setCode: string;        // 세트분리 코드 (세트상품 → 단품으로 분리 후 부여)
  isSetItem: boolean;     // 세트분리 여부
}

/** Phase 1 출력 ② — 세트분리·운송장매핑 결과 (운송장 재업로드용 payload) */
export interface TrackingMapping {
  orderNo: string;        // 원주문번호 (사방넷 식별키)
  trackingNo: string;     // 운송장번호
  courierCode: string;    // 택배사 코드 (CJ=04, 한진=05, 롯데=06 등 — TODO: 사방넷 코드표 확인)
  invoiceDate: string;    // 출고일 (YYYYMMDD)
}

// ─────────────────────────────────────────────────────────────────────
// 사방넷 API 응답 타입
// 실제 필드명은 https://sabangnet.co.kr/RTL_API/guide/ 확인 후 보정 필요
// TODO: API 키 수령 후 실제 응답 구조로 업데이트
// ─────────────────────────────────────────────────────────────────────

/** 사방넷 발주 주문 한 건 */
export interface SabangnetOrder {
  ord_no: string;           // 주문번호
  ord_channel: string;      // 채널명
  ord_date: string;         // 주문일
  ord_status: string;       // 주문상태
  prod_name: string;        // 상품명
  opt_name: string;         // 옵션명
  qty: number;              // 수량
  recv_name: string;        // 수령인
  recv_phone: string;       // 연락처
  recv_addr: string;        // 주소
  recv_addr_detail: string; // 상세주소
  recv_zipcode: string;     // 우편번호
  delivery_memo: string;    // 배송메모
  invoice_no?: string;      // 운송장번호 (출고 전엔 없음)
  courier_code?: string;    // 택배사 코드
}

/** 사방넷 주문 목록 API 응답 */
export interface SabangnetOrdersResponse {
  result: "success" | "fail";
  message?: string;
  total_count: number;
  orders: SabangnetOrder[];
}

/** 사방넷 운송장 등록 단건 */
export interface SabangnetTrackingItem {
  ord_no: string;       // 주문번호
  invoice_no: string;   // 운송장번호
  courier_code: string; // 택배사 코드
  send_date: string;    // 출고일 (YYYYMMDD)
}

/** 사방넷 운송장 등록 API 응답 */
export interface SabangnetTrackingResponse {
  result: "success" | "fail";
  message?: string;
  success_count: number;
  fail_count: number;
  fail_orders?: string[]; // 실패한 주문번호 목록
}

/** 사방넷 CS 문의 한 건 */
export interface SabangnetCS {
  cs_no: string;         // CS 문의번호
  ord_no: string;        // 연관 주문번호
  channel: string;       // 채널 (스마트스토어·쿠팡 등)
  category: string;      // 문의 유형 (배송/교환/반품/기타)
  content: string;       // 문의 내용
  created_at: string;    // 등록일시
  status: "unanswered" | "answered"; // 답변 상태
}

/** 사방넷 CS 목록 API 응답 */
export interface SabangnetCSListResponse {
  result: "success" | "fail";
  message?: string;
  total_count: number;
  cs_list: SabangnetCS[];
}

/** 사방넷 CS 답변 등록 payload */
export interface SabangnetCSAnswerPayload {
  cs_no: string;   // CS 문의번호
  answer: string;  // 답변 내용
}

/** 사방넷 CS 답변 등록 API 응답 */
export interface SabangnetCSAnswerResponse {
  result: "success" | "fail";
  message?: string;
}

/** 사방넷 클레임 한 건 (취소·반품·교환) */
export interface SabangnetClaim {
  claim_no: string;     // 클레임번호
  ord_no: string;       // 주문번호
  claim_type: "cancel" | "return" | "exchange"; // 유형
  reason: string;       // 사유
  created_at: string;   // 접수일시
  status: string;       // 처리상태
  // 배송지 변경이 포함된 경우 (고객문의 반영용)
  new_address?: string;
  new_phone?: string;
}

/** 사방넷 클레임 목록 API 응답 */
export interface SabangnetClaimListResponse {
  result: "success" | "fail";
  message?: string;
  total_count: number;
  claims: SabangnetClaim[];
}
