const KEY = "aiges:trend_scores_v1";

export function writeTrendScore(keyword: string, avg: number) {
  if (typeof window === "undefined") return;
  const prev = readAllTrendScores();
  localStorage.setItem(KEY, JSON.stringify({ ...prev, [keyword.trim()]: avg }));
}

export function readAllTrendScores(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
