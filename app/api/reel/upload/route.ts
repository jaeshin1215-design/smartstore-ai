export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

// 환경변수: META_INSTAGRAM_USER_ID, META_ACCESS_TOKEN (.env.local에 설정)
const IG_USER_ID  = process.env.META_INSTAGRAM_USER_ID ?? "";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const { videoUrl, caption } = await req.json();

  if (!videoUrl)
    return NextResponse.json({ error: "videoUrl 필요 (공개 접근 가능한 URL)" }, { status: 400 });
  if (!ACCESS_TOKEN || !IG_USER_ID)
    return NextResponse.json(
      { error: "META_ACCESS_TOKEN · META_INSTAGRAM_USER_ID 미설정" },
      { status: 500 }
    );

  // Step 1 — 미디어 컨테이너 생성
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption ?? "",
        share_to_feed: true,
        access_token: ACCESS_TOKEN,
      }),
    }
  );
  const container = await containerRes.json();
  if (!containerRes.ok || container.error)
    return NextResponse.json(
      { error: container.error?.message ?? "컨테이너 생성 실패" },
      { status: 500 }
    );

  const creationId: string = container.id;

  // Step 2 — 처리 완료 대기 (최대 60초, 4초 간격)
  let statusCode = "";
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const s = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    ).then(r => r.json());
    statusCode = s.status_code ?? "";
    if (statusCode === "FINISHED") break;
    if (statusCode === "ERROR")
      return NextResponse.json({ error: "인스타 영상 처리 오류" }, { status: 500 });
  }
  if (statusCode !== "FINISHED")
    return NextResponse.json({ error: "영상 처리 타임아웃 (60초 초과)" }, { status: 500 });

  // Step 3 — 게시
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: ACCESS_TOKEN }),
    }
  );
  const published = await publishRes.json();
  if (!publishRes.ok || published.error)
    return NextResponse.json(
      { error: published.error?.message ?? "게시 실패" },
      { status: 500 }
    );

  return NextResponse.json({ mediaId: published.id, status: "published" });
}
