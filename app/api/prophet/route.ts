import { NextRequest, NextResponse } from "next/server";

// 아이템 5: Prophet Modal 런타임 연동 스캐폴드
// 사방넷 승인과 무관하게 DataLab 52주 데이터로 Prophet 예측 실행
//
// 준비 필요:
//   1. modal.com 계정 생성 + `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` 환경변수 등록
//   2. scripts/prophet_app.py 를 Modal에 배포: `modal deploy scripts/prophet_app.py`
//   3. MODAL_PROPHET_URL 에 배포된 web endpoint URL 등록
//
// 현재 상태: MODAL_PROPHET_URL 미설정 시 DataLab 52주 데이터를 선형회귀 근사값으로 반환

const IZSTORY_CATEGORIES = ["압축팩", "다리미판", "화분", "유아매트"] as const;
type IzstoryCategory = typeof IZSTORY_CATEGORIES[number];

interface ProphetRequest {
  category: IzstoryCategory;
  ratios: number[];   // DataLab 52주 정규화 비율 (0–100)
  horizon?: number;   // 예측 주수, 기본 12
}

interface ProphetResponse {
  category: IzstoryCategory;
  forecast: number[];         // horizon 주 예측값 (0–100)
  trend: "rising" | "falling" | "stable";
  peak_week: number;          // 예측 구간 내 피크 주차 (0-based)
  source: "modal_prophet" | "linear_approx";
}

function linearApprox(ratios: number[], horizon: number): ProphetResponse["forecast"] {
  const n = ratios.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = ratios.reduce((s, v) => s + v, 0) / n;
  const slope = x.reduce((s, v, i) => s + (v - mx) * (ratios[i] - my), 0) /
                x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const intercept = my - slope * mx;
  return Array.from({ length: horizon }, (_, i) =>
    Math.max(0, Math.min(100, Math.round(intercept + slope * (n + i))))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json() as ProphetRequest;
  const { category, ratios, horizon = 12 } = body;

  if (!IZSTORY_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "지원하지 않는 카테고리" }, { status: 400 });
  }
  if (!Array.isArray(ratios) || ratios.length < 4) {
    return NextResponse.json({ error: "ratios 필드 누락 (최소 4개 필요)" }, { status: 400 });
  }

  const modalUrl = process.env.MODAL_PROPHET_URL;

  // Modal 배포됐으면 실제 Prophet 호출
  if (modalUrl) {
    try {
      const modalRes = await fetch(modalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, ratios, horizon }),
        signal: AbortSignal.timeout(30000),
      });
      if (modalRes.ok) {
        const data = await modalRes.json() as ProphetResponse;
        return NextResponse.json({ ...data, source: "modal_prophet" });
      }
    } catch { /* Modal 실패 시 폴백 */ }
  }

  // 폴백: 선형 근사
  const forecast = linearApprox(ratios, horizon);
  const peak_week = forecast.indexOf(Math.max(...forecast));
  const last4 = ratios.slice(-4), prev4 = ratios.slice(-8, -4);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const trend: ProphetResponse["trend"] =
    avg(last4) > avg(prev4) * 1.1 ? "rising" :
    avg(last4) < avg(prev4) * 0.9 ? "falling" : "stable";

  return NextResponse.json({
    category, forecast, trend, peak_week, source: "linear_approx",
    note: "MODAL_PROPHET_URL 미설정 — 선형 근사값. modal deploy scripts/prophet_app.py 후 env 등록 필요",
  } satisfies ProphetResponse & { note: string });
}
