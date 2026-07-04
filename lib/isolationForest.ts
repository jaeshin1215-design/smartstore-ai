// Isolation Forest — 이상탐지 (JS 순수 구현)
// features: number[][] — 각 행이 하나의 샘플, 각 열이 feature

interface INode {
  feature?: number;
  split?: number;
  left?: INode;
  right?: INode;
  size: number;
}

// BST 평균 경로 길이 보정값
function c(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

// Linear congruential RNG (재현성 보장)
function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function buildTree(data: number[][], depth: number, maxDepth: number, rng: () => number): INode {
  if (depth >= maxDepth || data.length <= 1) return { size: data.length };
  const nf = data[0].length;
  const feat = Math.floor(rng() * nf);
  const vals = data.map(d => d[feat]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) return { size: data.length };
  const split = lo + rng() * (hi - lo);
  return {
    feature: feat, split,
    left: buildTree(data.filter(d => d[feat] < split), depth + 1, maxDepth, rng),
    right: buildTree(data.filter(d => d[feat] >= split), depth + 1, maxDepth, rng),
    size: data.length,
  };
}

function pathLen(node: INode, p: number[], depth: number): number {
  if (node.feature === undefined || !node.left || !node.right) return depth + c(node.size);
  return p[node.feature] < node.split!
    ? pathLen(node.left, p, depth + 1)
    : pathLen(node.right, p, depth + 1);
}

function normalize(data: number[][]): number[][] {
  const nf = data[0].length;
  const lo = Array(nf).fill(Infinity), hi = Array(nf).fill(-Infinity);
  data.forEach(d => d.forEach((v, i) => { lo[i] = Math.min(lo[i], v); hi[i] = Math.max(hi[i], v); }));
  return data.map(d => d.map((v, i) => hi[i] === lo[i] ? 0 : (v - lo[i]) / (hi[i] - lo[i])));
}

export interface IFResult {
  index: number;
  score: number; // 0~1, 높을수록 이상치
  isAnomaly: boolean;
}

export function isolationForest(
  data: number[][],
  contamination = 0.05,
  nTrees = 100,
  subSample = 256,
): IFResult[] {
  const n = data.length;
  if (n === 0) return [];
  const ss = Math.min(subSample, n);
  const maxDepth = Math.ceil(Math.log2(ss));
  const norm = normalize(data);
  const cn = c(ss);

  // 트리 구축
  const trees: INode[] = [];
  for (let t = 0; t < nTrees; t++) {
    const rng = makeLcg(t * 1234567 + 98765);
    // 부분표본 Fisher-Yates
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    trees.push(buildTree(idx.slice(0, ss).map(i => norm[i]), 0, maxDepth, rng));
  }

  // 이상치 점수 계산
  const scores = norm.map(p => {
    const avg = trees.reduce((s, t) => s + pathLen(t, p, 0), 0) / nTrees;
    return Math.pow(2, -avg / cn);
  });

  // contamination 기준 임계값
  const nAnom = Math.max(1, Math.floor(contamination * n));
  const sorted = [...scores].sort((a, b) => b - a);
  const threshold = sorted[nAnom - 1];

  return scores.map((score, index) => ({
    index,
    score: Math.round(score * 1000) / 1000,
    isAnomaly: score >= threshold,
  }));
}
