import { prisma } from "@/lib/prisma";

import { DEFAULT_RANKING_WEIGHTS_V1 } from "./ranking-weights";
import type { RankingAlgorithmVersionInfo, RankingWeightRow } from "./types";

const DEFAULT_VERSION = "v1";

export async function ensureDefaultRankingVersion(): Promise<{
  version: RankingAlgorithmVersionInfo;
  weights: RankingWeightRow[];
}> {
  let row = await prisma.rankingAlgorithmVersion.findFirst({
    where: { isActive: true },
    include: { weights: true },
    orderBy: { createdAt: "asc" },
  });

  if (!row) {
    row = await prisma.rankingAlgorithmVersion.create({
      data: {
        id: "rank_v1_default",
        version: DEFAULT_VERSION,
        label: "Ranking V1",
        description: "Baseline ranking intelligence weights",
        isActive: true,
        weights: {
          create: DEFAULT_RANKING_WEIGHTS_V1.map((w) => ({
            factorKey: w.factorKey,
            groupKey: w.groupKey,
            label: w.label,
            weightPercent: w.weightPercent,
          })),
        },
      },
      include: { weights: true },
    });
  }

  return {
    version: {
      id: row.id,
      version: row.version,
      label: row.label,
      description: row.description,
      isActive: row.isActive,
    },
    weights: row.weights.map((w) => ({
      factorKey: w.factorKey,
      groupKey: w.groupKey as RankingWeightRow["groupKey"],
      label: w.label,
      weightPercent: w.weightPercent,
    })),
  };
}

export async function getActiveRankingVersion(): Promise<{
  version: RankingAlgorithmVersionInfo;
  weights: RankingWeightRow[];
}> {
  return ensureDefaultRankingVersion();
}

export async function listRankingVersions(): Promise<RankingAlgorithmVersionInfo[]> {
  const rows = await prisma.rankingAlgorithmVersion.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    version: r.version,
    label: r.label,
    description: r.description,
    isActive: r.isActive,
  }));
}
