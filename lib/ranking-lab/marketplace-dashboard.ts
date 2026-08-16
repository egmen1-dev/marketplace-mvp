import { computeRankingScore } from "@/lib/marketplace-ranking-intelligence/ranking-score";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import { computeFactorImportance } from "./importance-engine";
import type { LabHeatmapCell, LabMarketplaceDashboard } from "./types";

type RankedRow = {
  product: RankingProductInput;
  position: number;
  totalScore: number;
  organicScore: number;
  topBlocked: boolean;
};

function scoreBand(score: number): string {
  if (score >= 85) return "85–100";
  if (score >= 70) return "70–84";
  if (score >= 50) return "50–69";
  return "0–49";
}

export function buildCategoryScoreHeatmap(ranked: RankedRow[]): LabHeatmapCell[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const row of ranked) {
    const cat = row.product.categoryName ?? "unknown";
    const prev = map.get(cat) ?? { sum: 0, count: 0 };
    prev.sum += row.organicScore;
    prev.count += 1;
    map.set(cat, prev);
  }
  return [...map.entries()].map(([category, { sum, count }]) => ({
    x: category,
    y: "avg_score",
    value: Math.round((sum / count) * 10) / 10,
    count,
  }));
}

export function buildFactorInfluenceHeatmap(
  ranked: RankedRow[],
): LabHeatmapCell[] {
  const importance = computeFactorImportance(ranked, DEFAULT_RANKING_WEIGHTS_V1);
  const categories = [...new Set(ranked.map((r) => r.product.categoryName ?? "unknown"))].slice(
    0,
    10,
  );

  const cells: LabHeatmapCell[] = [];
  for (const cat of categories) {
    const subset = ranked.filter((r) => (r.product.categoryName ?? "unknown") === cat);
    for (const imp of importance.slice(0, 6)) {
      const avg =
        subset.reduce((s, r) => {
          const score = computeRankingScore(r.product, DEFAULT_RANKING_WEIGHTS_V1);
          const factor = score.factors.find((f) => f.factorKey === imp.factorKey);
          return s + (factor?.score ?? 0);
        }, 0) / Math.max(1, subset.length);
      cells.push({
        x: cat,
        y: imp.label,
        value: Math.round(avg * 10) / 10,
        count: subset.length,
      });
    }
  }
  return cells;
}

export function buildMarketplaceDashboard(ranked: RankedRow[]): LabMarketplaceDashboard {
  const importance = computeFactorImportance(ranked, DEFAULT_RANKING_WEIGHTS_V1);
  const scores = ranked.map((r) => r.organicScore);
  const avg = (vals: number[]) =>
    Math.round((vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)) * 10) / 10;

  const trustVals = ranked.map((r) => r.product.sellerTrustScore);
  const seoVals = ranked.map((r) => {
    const s = computeRankingScore(r.product, DEFAULT_RANKING_WEIGHTS_V1);
    return s.factors.find((f) => f.factorKey === "seo")?.score ?? 0;
  });
  const ctrVals = ranked.map((r) =>
    r.product.views > 0 ? (r.product.favoritesCount / r.product.views) * 100 : 0,
  );
  const convVals = ranked.map((r) =>
    r.product.views > 0 ? (r.product.ordersCount / r.product.views) * 100 : 0,
  );

  const good = ranked.filter((r) => r.organicScore >= 70 && !r.topBlocked).length;
  const bad = ranked.filter((r) => r.organicScore < 50 || r.topBlocked).length;

  const categoryMap = new Map<string, number[]>();
  for (const row of ranked) {
    const cat = row.product.categoryName ?? "unknown";
    const arr = categoryMap.get(cat) ?? [];
    arr.push(row.organicScore);
    categoryMap.set(cat, arr);
  }

  const bands = new Map<string, number>();
  for (const s of scores) {
    const b = scoreBand(s);
    bands.set(b, (bands.get(b) ?? 0) + 1);
  }

  return {
    datasetSize: ranked.length,
    algorithmVersion: "v1-lab",
    averageScore: avg(scores),
    averageTrust: avg(trustVals),
    averageSeo: avg(seoVals),
    averageCtr: avg(ctrVals),
    averageConversion: avg(convVals),
    goodCardsPercent: Math.round((good / ranked.length) * 1000) / 10,
    badCardsPercent: Math.round((bad / ranked.length) * 1000) / 10,
    topFactors: importance.slice(0, 8),
    categoryQuality: [...categoryMap.entries()]
      .map(([category, vals]) => ({
        category,
        avgScore: avg(vals),
        count: vals.length,
      }))
      .sort((a, b) => a.avgScore - b.avgScore),
    qualityDistribution: [...bands.entries()].map(([band, count]) => ({
      band,
      count,
      percent: Math.round((count / ranked.length) * 1000) / 10,
    })),
    heatmaps: {
      categoryScore: buildCategoryScoreHeatmap(ranked),
      factorInfluence: buildFactorInfluenceHeatmap(ranked),
    },
  };
}
