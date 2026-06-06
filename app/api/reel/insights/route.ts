import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN ?? "";

// 타깃 반응 중심 지표 (구매 전환 제외)
const METRICS = [
  "reach",                          // 유니크 도달 수
  "plays",                          // 재생 횟수
  "ig_reels_avg_watch_time",        // 평균 시청 시간 (ms)
  "ig_reels_video_view_total_time", // 누적 시청 시간 (ms)
  "saved",                          // 저장 수 — 구매 의도 핵심 지표
  "shares",                         // 공유
  "comments",                       // 댓글
  "likes",                          // 좋아요
  "total_interactions",             // 전체 인게이지먼트
].join(",");

export async function GET(req: NextRequest) {
  const mediaId = new URL(req.url).searchParams.get("mediaId");

  if (!mediaId)
    return NextResponse.json({ error: "mediaId 필요" }, { status: 400 });
  if (!ACCESS_TOKEN)
    return NextResponse.json({ error: "META_ACCESS_TOKEN 미설정" }, { status: 500 });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=${METRICS}&access_token=${ACCESS_TOKEN}`
  );
  const data = await res.json();

  if (!res.ok || data.error)
    return NextResponse.json(
      { error: data.error?.message ?? "인사이트 조회 실패 (게시 후 24~48시간 후 재시도)" },
      { status: 500 }
    );

  // 평탄화: { metric_name: value }
  const metrics: Record<string, number | string> = {};
  for (const item of data.data ?? []) {
    const val = item.values?.[0]?.value ?? item.value ?? 0;
    metrics[item.name] = val;
  }

  // 평균 시청 시간 ms → 초 변환
  if (metrics.ig_reels_avg_watch_time)
    metrics.avg_watch_sec = +(Number(metrics.ig_reels_avg_watch_time) / 1000).toFixed(1);

  return NextResponse.json(metrics);
}
