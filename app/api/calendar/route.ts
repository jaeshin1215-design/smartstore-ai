import { NextRequest, NextResponse } from "next/server";

const EVENTS = [
  { summary: "🛠️ [1주차] smartstore-ai 버그 완전 수정", start: "2026-04-18", end: "2026-04-20", description: "max_tokens 수정 완료\nPromise.allSettled 적용\n전체 API 오류 점검" },
  { summary: "🎨 [1주차] UI/UX 개선", start: "2026-04-20", end: "2026-04-22", description: "디자인 개선\n랜딩 첫 화면 정리\n모바일 최적화" },
  { summary: "🚀 [1주차] Vercel 배포 + 도메인 연결", start: "2026-04-22", end: "2026-04-25", description: "Vercel 프로덕션 배포\n커스텀 도메인 연결" },
  { summary: "💳 [2주차] 결제 시스템 연결 (Stripe)", start: "2026-04-25", end: "2026-04-27", description: "Stripe 계정 생성\n결제 API 연결" },
  { summary: "🔒 [2주차] 무료/유료 플랜 구분", start: "2026-04-27", end: "2026-04-29", description: "무료/유료 기능 분리\n플랜 페이지 제작" },
  { summary: "🌐 [2주차] 랜딩페이지 제작", start: "2026-04-29", end: "2026-05-02", description: "랜딩페이지 카피\n디자인 적용" },
  { summary: "📺 [3주차] 유튜브 채널 개설", start: "2026-05-02", end: "2026-05-04", description: "채널 개설\n콘텐츠 방향 정리" },
  { summary: "🎬 [3주차] 첫 영상 촬영", start: "2026-05-04", end: "2026-05-07", description: "스크립트 작성\n화면 녹화 + 편집" },
  { summary: "📤 [3주차] 유튜브 업로드 + SEO", start: "2026-05-07", end: "2026-05-09", description: "영상 업로드\nSEO 최적화" },
  { summary: "📊 [4주차] 유저 피드백 반영", start: "2026-05-09", end: "2026-05-12", description: "피드백 수집\n버그 수정" },
  { summary: "⚙️ [4주차] Paperclip + n8n 자동화", start: "2026-05-12", end: "2026-05-15", description: "n8n 배포 파이프라인\nPaperclip 에이전트 설정" },
  { summary: "💡 [4주차] 두 번째 앱 기획", start: "2026-05-15", end: "2026-05-18", description: "새 앱 PRD 작성\nMVP 범위 정의" },
  { summary: "🎯 목표: 첫 유료 결제 받기!", start: "2026-05-18", end: "2026-05-19", description: "30일 목표 달성 체크" },
];

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("google_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Google 로그인이 필요합니다.", needAuth: true }, { status: 401 });
  }

  const results = [];

  for (const event of EVENTS) {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { date: event.start },
        end: { date: event.end },
      }),
    });
    const data = await res.json();
    results.push({ title: event.summary, status: res.ok ? "success" : "failed" });
  }

  const success = results.filter(r => r.status === "success").length;
  return NextResponse.json({ message: `${success}개 일정이 Google Calendar에 등록됐습니다.`, results });
}
