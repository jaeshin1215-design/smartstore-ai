// ─────────────────────────────────────────────────────────────────────
// 사방넷 CS 문의 조회 + 답변 등록 API
// GET  — SABANG_CS_LIST: 미답변 문의 목록 수집
// POST — SABANG_CS_ANS_REG: 심유나 프로 확인·수정 후 사방넷에 답변 등록
//
// 범위 경계: 사방넷 연동 채널만 (수기채널 제외 — 심유나 프로 확정)
// ─────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { sabangnetPost, checkSabangnetConfig, SabangnetError } from "@/lib/sabangnet/client";
import type {
  SabangnetCSListResponse,
  SabangnetCSAnswerPayload,
  SabangnetCSAnswerResponse,
  SabangnetClaimListResponse,
} from "@/lib/sabangnet/types";

// ── 테스트 모드 목 데이터 ────────────────────────────────────────────
const TEST_CS_LIST = [
  {
    cs_no: "test_001",
    ord_no: "20260701-0041",
    channel: "네이버",
    category: "배송 문의",
    content: "어제 주문했는데 배송 출발은 언제쯤 되나요? 내일 행사 때 쓸 거라 꼭 오늘 받아야 해요.",
    created_at: "2026-07-02",
    status: "unanswered",
  },
  {
    cs_no: "test_002",
    ord_no: "20260630-0087",
    channel: "쿠팡",
    category: "교환·반품",
    content: "사이즈가 생각보다 커서 교환 가능한가요? 미개봉 상태입니다.",
    created_at: "2026-07-01",
    status: "unanswered",
  },
  {
    cs_no: "test_003",
    ord_no: "20260629-0012",
    channel: "네이버",
    category: "상품 문의",
    content: "이 제품 다른 색상도 있나요? 검정 말고 흰색이나 베이지 계열이 있으면 좋겠어요.",
    created_at: "2026-06-30",
    status: "unanswered",
  },
];

// ── GET: 미답변 CS 문의 목록 ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isTest = searchParams.get("test") === "1";

  // 테스트 모드: API 키 없어도 목 데이터 반환
  if (isTest) {
    return NextResponse.json({
      mode: "cs",
      total: TEST_CS_LIST.length,
      cs_list: TEST_CS_LIST,
      _test: true,
    });
  }

  // 환경변수 프리플라이트
  const config = checkSabangnetConfig();
  if (!config.ok) {
    return NextResponse.json(
      { error: "사방넷 API 키 미설정", missing: config.missing },
      { status: 503 }
    );
  }

  const mode = searchParams.get("mode") ?? "cs"; // cs | claim

  try {
    if (mode === "claim") {
      // 클레임 수집: 취소·반품·교환 (배송지변경·취소요청 자동반영 용도)
      // TODO: 실제 사방넷 클레임 수집 함수명 확인 (가이드: "클레임수집")
      const response = await sabangnetPost<SabangnetClaimListResponse>(
        "claims", // TODO: 실제 엔드포인트 경로 확인
        {
          mode: "GET_CLAIM_LIST", // TODO: 실제 mode 값 확인
          status: "미처리",       // TODO: 실제 상태값 확인
        }
      );

      return NextResponse.json({
        mode: "claim",
        total: response.total_count,
        claims: response.claims,
      });
    }

    // CS 문의 목록 (SABANG_CS_LIST)
    const response = await sabangnetPost<SabangnetCSListResponse>(
      "cs",  // TODO: 실제 엔드포인트 경로 확인
      {
        mode: "SABANG_CS_LIST",
        status: "unanswered",  // 미답변만
        // TODO: 채널 필터 파라미터 확인 (수기채널 제외 처리)
      }
    );

    return NextResponse.json({
      mode: "cs",
      total: response.total_count,
      cs_list: response.cs_list,
    });
  } catch (err) {
    if (err instanceof SabangnetError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[sabangnet/cs GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// ── POST: CS 답변 등록 (SABANG_CS_ANS_REG) ───────────────────────────

export async function POST(req: NextRequest) {
  let body: SabangnetCSAnswerPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식 오류" }, { status: 400 });
  }

  if (!body.cs_no || !body.answer?.trim()) {
    return NextResponse.json(
      { error: "cs_no와 answer 필드 필수" },
      { status: 400 }
    );
  }

  // 테스트 모드: test_ 접두어 cs_no는 사방넷 호출 없이 성공 응답
  if (body.cs_no.startsWith("test_")) {
    return NextResponse.json({
      success: true,
      message: "[테스트] 답변 등록 완료 (사방넷 실제 전송 없음)",
      cs_no: body.cs_no,
      _test: true,
    });
  }

  // 환경변수 프리플라이트 (실제 모드에서만)
  const config = checkSabangnetConfig();
  if (!config.ok) {
    return NextResponse.json(
      { error: "사방넷 API 키 미설정", missing: config.missing },
      { status: 503 }
    );
  }

  try {
    // 사방넷에 답변 직접 등록 (SABANG_CS_ANS_REG)
    const response = await sabangnetPost<SabangnetCSAnswerResponse>(
      "cs/answer",  // TODO: 실제 엔드포인트 경로 확인
      {
        mode: "SABANG_CS_ANS_REG",
        cs_no: body.cs_no,
        answer: body.answer,
      }
    );

    return NextResponse.json({
      success: response.result === "success",
      message: response.message ?? "답변 등록 완료",
      cs_no: body.cs_no,
    });
  } catch (err) {
    if (err instanceof SabangnetError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[sabangnet/cs POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
