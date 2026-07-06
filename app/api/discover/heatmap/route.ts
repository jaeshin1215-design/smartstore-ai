import { NextResponse } from "next/server";

// DataLab 52주 검색량 → 과거8주 + Prophet/추세 예측4주
// MODAL_PROPHET_URL 설정 시 Modal Prophet 사용, 미설정 시 단순 추세 외삽(fallback)

const NAVER_API = "https://openapi.naver.com/v1/datalab/search";
const CLIENT_ID = process.env.NAVER_DATALAB_CLIENT_ID!;
const CLIENT_SECRET = process.env.NAVER_DATALAB_CLIENT_SECRET!;
const MODAL_URL = process.env.MODAL_PROPHET_URL ?? "";

const PRODS = ["압축팩", "다리미판", "화분", "유아매트"];
const PAST = 8, FUTURE = 4;

// Modal 미배포 시 fallback 패턴
const FALLBACK_HEAT = [
  [0.32,0.42,0.62,0.82,0.90,0.78,0.62,0.48, 0.45,0.52,0.62,0.72],
  [0.55,0.58,0.60,0.62,0.60,0.58,0.55,0.52, 0.52,0.54,0.55,0.57],
  [0.35,0.52,0.88,0.80,0.65,0.50,0.38,0.28, 0.24,0.22,0.20,0.22],
  [0.30,0.38,0.52,0.68,0.90,0.85,0.68,0.50, 0.45,0.48,0.52,0.60],
];

function extrapolate(ratios: number[], horizon: number): number[] {
  const last = ratios.slice(-4);
  const avg = last.reduce((s, v) => s + v, 0) / last.length;
  const slope = last.length >= 2 ? (last[last.length - 1] - last[0]) / last.length : 0;
  return Array.from({ length: horizon }, (_, i) =>
    Math.max(0, Math.min(100, avg + slope * (i + 1)))
  );
}

function calcWeekLabels(periods: string[]): string[] {
  const past = periods.slice(-PAST).map(p => {
    const d = new Date(p);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const lastDate = new Date(periods[periods.length - 1]);
  const future = Array.from({ length: FUTURE }, (_, i) => {
    const d = new Date(lastDate.getTime() + (i + 1) * 7 * 86400000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  return [...past, ...future];
}

function fallbackWeekLabels(): string[] {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(today.getTime() + mondayOffset * 86400000);
  return Array.from({ length: PAST + FUTURE }, (_, i) => {
    const d = new Date(thisMonday.getTime() + (i - PAST + 1) * 7 * 86400000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}

export async function GET() {
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 364 * 86400000).toISOString().split("T")[0];

    const res = await fetch(NAVER_API, {
      method: "POST",
      headers: {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        timeUnit: "week",
        keywordGroups: PRODS.map(kw => ({ groupName: kw, keywords: [kw] })),
      }),
    });

    if (!res.ok) throw new Error(`DataLab ${res.status}`);
    const dl = await res.json() as {
      results?: { title: string; data: { period: string; ratio: number }[] }[];
    };

    if (!Array.isArray(dl?.results) || dl.results.length < PRODS.length) {
      throw new Error("DataLab 결과 부족");
    }

    const firstSeries = dl.results[0].data;
    const weekLabels = calcWeekLabels(firstSeries.map(d => d.period));

    const products = await Promise.all(
      PRODS.map(async (name, ri) => {
        const series = dl.results![ri]?.data ?? [];
        const allRatios = series.map(d => d.ratio); // 0-100 scale

        const past = allRatios.slice(-PAST).map(v => Math.round(v) / 100);

        let future: number[];
        let src = "extrapolation";

        if (MODAL_URL) {
          try {
            const propRes = await fetch(MODAL_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: name, ratios: allRatios, horizon: FUTURE }),
            });
            if (!propRes.ok) throw new Error(`Modal ${propRes.status}`);
            const propData = await propRes.json() as { forecast?: number[] };
            if (!Array.isArray(propData.forecast) || propData.forecast.length < FUTURE) {
              throw new Error("forecast 부족");
            }
            future = propData.forecast.slice(0, FUTURE).map(v => Math.min(1, Math.max(0, v / 100)));
            src = "modal_prophet";
          } catch {
            future = extrapolate(allRatios, FUTURE).map(v => v / 100);
          }
        } else {
          future = extrapolate(allRatios, FUTURE).map(v => v / 100);
        }

        const last4 = allRatios.slice(-4);
        const prev4 = allRatios.slice(-8, -4);
        const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
        const trend: "rising" | "falling" | "stable" =
          avg(last4) > avg(prev4) * 1.1 ? "rising" :
          avg(last4) < avg(prev4) * 0.9 ? "falling" : "stable";

        return { name, past, future, trend, src };
      })
    );

    const source = products.some(p => p.src === "modal_prophet") ? "modal_prophet" : "datalab_extrap";
    return NextResponse.json({ products, weekLabels, source });
  } catch (e) {
    console.error("[heatmap fallback]", e);
    const products = PRODS.map((name, ri) => ({
      name,
      past: FALLBACK_HEAT[ri].slice(0, PAST),
      future: FALLBACK_HEAT[ri].slice(PAST),
      trend: "stable" as const,
      src: "fallback",
    }));
    return NextResponse.json({ products, weekLabels: fallbackWeekLabels(), source: "fallback" });
  }
}
