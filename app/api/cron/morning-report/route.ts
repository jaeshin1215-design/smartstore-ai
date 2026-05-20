export const maxDuration = 60;

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { callClaude } from "@/lib/claude";

const TO_EMAIL = process.env.REPORT_EMAIL ?? "jaeshin1215@gmail.com";

const NAVER_API = "https://openapi.naver.com/v1/datalab/search";

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

const SEASON_FALLBACKS: Record<string, string[]> = {
  봄: ["봄옷", "캠핑용품", "다이어트", "꽃무늬원피스", "자외선차단제"],
  여름: ["수영복", "선풍기", "에어컨청소", "여름원피스", "아이스팩"],
  가을: ["가을자켓", "단풍여행", "핫초코", "무릎담요", "등산화"],
  겨울: ["패딩", "핫팩", "크리스마스선물", "전기장판", "방한장갑"],
};

async function fetchTrends(keywords: string[]) {
  const { startDate, endDate } = getDateRange();
  const keywordGroups = keywords.map((kw) => ({ groupName: kw, keywords: [kw] }));
  const res = await fetch(NAVER_API, {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_DATALAB_CLIENT_ID!,
      "X-Naver-Client-Secret": process.env.NAVER_DATALAB_CLIENT_SECRET!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate, endDate, timeUnit: "date", keywordGroups }),
  });
  if (!res.ok) throw new Error(`Naver API ${res.status}`);
  return res.json();
}

function buildEmailHtml(
  keywords: { keyword: string; avg: number; growth: number; comment: string }[],
  aiReport: string,
  youtubeScript: string,
  today: string
): string {
  const rows = keywords
    .map(
      (k) => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px 12px;font-weight:600;color:#1a1a1a;">${k.keyword}</td>
      <td style="padding:10px 12px;text-align:center;color:#555;">${k.avg}</td>
      <td style="padding:10px 12px;text-align:center;color:${k.growth > 0 ? "#16a34a" : k.growth < 0 ? "#dc2626" : "#555"};">
        ${k.growth > 0 ? "▲" : k.growth < 0 ? "▼" : "–"} ${Math.abs(k.growth)}%
      </td>
      <td style="padding:10px 12px;color:#444;font-size:13px;">${k.comment}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:28px 32px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.8);font-size:13px;">${today} 오전 6시 자동 리포트</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📊 스마트스토어 오늘의 트렌드</h1>
    </div>

    <!-- 키워드 테이블 -->
    <div style="padding:24px 32px 0;">
      <h2 style="margin:0 0 16px;font-size:16px;color:#111;">🔥 오늘의 급상승 키워드 TOP 5</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;color:#666;">
            <th style="padding:10px 12px;text-align:left;font-weight:600;">키워드</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;">검색지수</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;">전주대비</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;">AI 코멘트</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- AI 분석 -->
    <div style="padding:24px 32px 0;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#111;">🤖 AI 트렌드 분석</h2>
      <div style="background:#f0f4ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.7;color:#333;white-space:pre-wrap;">${aiReport}</div>
    </div>

    <!-- 유튜브 스크립트 -->
    <div style="padding:24px 32px 32px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#111;">🎬 오늘의 유튜브 스크립트 초안</h2>
      <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:16px 20px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.8;color:#333;white-space:pre-wrap;">${youtubeScript}</div>
      <p style="margin:12px 0 0;font-size:12px;color:#999;">* AI 초안입니다. 직접 검토·수정 후 활용하세요.</p>
    </div>

    <!-- 푸터 -->
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #eee;text-align:center;">
      <p style="margin:0;font-size:12px;color:#aaa;">smartstore-ai 자동 리포트 · 매일 오전 6시 발송</p>
    </div>
  </div>
</body>
</html>`;
}

export async function GET() {
  try {
    const month = new Date().getMonth() + 1;
    const season = getSeason(month);
    const fallback = SEASON_FALLBACKS[season] ?? ["인기상품", "베스트셀러", "신상품", "할인상품", "추천상품"];

    // 1. 시즌 키워드 생성
    let keywords: string[] = fallback;
    try {
      const raw = await callClaude(
        `지금은 ${month}월 ${season} 시즌입니다. 스마트스토어에서 지금 잘 팔리는 상품 키워드 5개를 JSON 배열로만 답해주세요: ["키워드1","키워드2","키워드3","키워드4","키워드5"]`,
        150
      );
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      if (Array.isArray(parsed) && parsed.length >= 3) keywords = parsed.slice(0, 5);
    } catch { /* fallback 유지 */ }

    // 2. Naver 트렌드 데이터
    let hotKeywords: { keyword: string; avg: number; growth: number }[] = keywords.map((kw) => ({
      keyword: kw,
      avg: 0,
      growth: 0,
    }));

    try {
      const naverData = await fetchTrends(keywords);
      if (Array.isArray(naverData?.results)) {
        hotKeywords = naverData.results.map((r: { title: string; data: { ratio: number }[] }) => {
          const data = r.data ?? [];
          const recent = data.slice(-7).reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / 7;
          const prev = data.slice(-14, -7).reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / 7;
          return {
            keyword: r.title,
            avg: Math.round((data.reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / (data.length || 1)) * 10) / 10,
            growth: prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0,
          };
        });
        hotKeywords.sort((a, b) => b.growth - a.growth);
      }
    } catch (e) {
      console.error("[morning-report] Naver error:", e);
    }

    // 3. AI 코멘트
    let comments: Record<string, string> = {};
    try {
      const summaries = hotKeywords
        .map((k) => `${k.keyword}: 검색지수 ${k.avg}, 전주대비 ${k.growth > 0 ? "+" : ""}${k.growth}%`)
        .join("\n");
      const raw = await callClaude(
        `스마트스토어 셀러를 위해 각 키워드의 트렌드 한 줄 코멘트를 작성해주세요. 형식: "지금 [키워드] 검색량 [상태] → [행동 제안]" (25자 이내)\n\n${summaries}\n\nJSON 형식으로만: {"키워드1": "코멘트1", "키워드2": "코멘트2"}`,
        400
      );
      comments = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch { /* 기본 코멘트 사용 */ }

    const keywordsWithComments = hotKeywords.map((k) => ({
      ...k,
      comment:
        comments[k.keyword] ??
        (k.growth > 10
          ? `지금 ${k.keyword} 급상승 중 → 바로 등록하세요`
          : `${k.keyword} ${season} 시즌 주목 키워드`),
    }));

    // 4. AI 트렌드 리포트
    const summaryText = hotKeywords
      .map((k) => `${k.keyword}: 검색지수 ${k.avg}, ${k.growth > 0 ? "+" : ""}${k.growth}%`)
      .join(" | ");

    let aiReport = "오늘 트렌드 분석을 준비 중입니다.";
    try {
      aiReport = await callClaude(
        `스마트스토어 셀러 Jae를 위한 오늘(${month}월 ${season} 시즌) 트렌드 리포트를 작성해주세요.

오늘의 키워드 데이터:
${summaryText}

다음 내용을 포함해 한국어로 3~4문단 작성:
1. 오늘 가장 주목할 키워드 1~2개와 이유
2. 이 시즌 스마트스토어 트렌드 흐름
3. 오늘 Jae가 바로 실행할 수 있는 구체적 행동 2가지`,
        600
      );
    } catch { /* 기본값 유지 */ }

    // 5. 유튜브 스크립트 초안
    const topKeyword = hotKeywords[0]?.keyword ?? season + " 트렌드";
    let youtubeScript = "유튜브 스크립트 초안 생성 중 오류가 발생했습니다.";
    try {
      youtubeScript = await callClaude(
        `스마트스토어 셀러를 위한 유튜브 영상 스크립트 초안을 작성해주세요.

주제: "${topKeyword}" ${season} 시즌 스마트스토어 판매 전략

형식 (Jae가 직접 촬영·수정할 초안):
[인트로] (15초) - 시청자 관심 끌기
[본론 1] (60초) - 트렌드 설명
[본론 2] (60초) - 실전 판매 팁 2~3가지
[아웃트로] (15초) - 구독 유도

자연스러운 구어체로 작성하되, 각 섹션 제목과 예상 발화 시간 포함.`,
        800
      );
    } catch { /* 기본값 유지 */ }

    // 6. 이메일 발송
    const today = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });

    const html = buildEmailHtml(keywordsWithComments, aiReport, youtubeScript, today);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "스마트스토어 AI <onboarding@resend.dev>",
      to: TO_EMAIL,
      subject: `[${today}] 스마트스토어 오늘의 트렌드 리포트 📊`,
      html,
    });

    if (error) throw new Error(error.message ?? "Resend error");

    return NextResponse.json({ ok: true, sent_to: TO_EMAIL, keywords: keywords });
  } catch (err) {
    console.error("[morning-report] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
