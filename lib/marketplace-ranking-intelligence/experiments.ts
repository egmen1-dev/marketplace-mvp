import { prisma } from "@/lib/prisma";

import { runRankingLabExperiment } from "./ranking-lab";
import type { RankingExperimentRow } from "./types";

export async function listRankingExperiments(limit = 20): Promise<RankingExperimentRow[]> {
  const rows = await prisma.rankingExperiment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapExperiment);
}

export async function createRankingExperiment(input: {
  name: string;
  purpose: string;
  datasetSize: number;
  changedFactor: string;
  versionId?: string;
  createdById?: string;
}): Promise<RankingExperimentRow> {
  const row = await prisma.rankingExperiment.create({
    data: {
      name: input.name,
      purpose: input.purpose,
      datasetSize: input.datasetSize,
      changedFactor: input.changedFactor,
      versionId: input.versionId,
      createdById: input.createdById,
      status: "DRAFT",
    },
  });
  return mapExperiment(row);
}

export async function executeRankingExperiment(experimentId: string): Promise<RankingExperimentRow> {
  const experiment = await prisma.rankingExperiment.findUnique({ where: { id: experimentId } });
  if (!experiment) throw new Error("Эксперимент не найден");

  await prisma.rankingExperiment.update({
    where: { id: experimentId },
    data: { status: "RUNNING" },
  });

  try {
    const report = await runRankingLabExperiment({
      datasetSize: experiment.datasetSize,
      changedFactor: experiment.changedFactor,
      versionId: experiment.versionId,
    });

    const updated = await prisma.rankingExperiment.update({
      where: { id: experimentId },
      data: {
        status: "COMPLETED",
        beforeMetrics: report.before,
        afterMetrics: report.after,
        rankingImpact: report.rankingImpact,
        confidence: report.confidence,
        completedAt: new Date(),
      },
    });

    if (experiment.versionId) {
      await prisma.rankingInfluenceSnapshot.create({
        data: {
          versionId: experiment.versionId,
          influences: report.influences,
        },
      });
    }

    return mapExperiment(updated);
  } catch {
    const failed = await prisma.rankingExperiment.update({
      where: { id: experimentId },
      data: { status: "FAILED", completedAt: new Date() },
    });
    return mapExperiment(failed);
  }
}

function mapExperiment(row: {
  id: string;
  name: string;
  purpose: string;
  datasetSize: number;
  changedFactor: string;
  status: string;
  rankingImpact: string | null;
  confidence: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): RankingExperimentRow {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    datasetSize: row.datasetSize,
    changedFactor: row.changedFactor,
    status: row.status,
    rankingImpact: row.rankingImpact,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}
