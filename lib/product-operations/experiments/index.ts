import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export type ExperimentVariant = { id: string; name: string; weight: number };

export async function listExperiments() {
  return prisma.productExperiment.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function upsertExperiment(input: {
  key: string;
  name: string;
  status?: string;
  variants: ExperimentVariant[];
  winner?: string;
  metrics?: Record<string, unknown>;
}) {
  return prisma.productExperiment.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: input.name,
      status: input.status ?? "draft",
      variants: input.variants as Prisma.InputJsonValue,
      winner: input.winner,
      metrics: input.metrics as Prisma.InputJsonValue | undefined,
    },
    update: {
      name: input.name,
      status: input.status,
      variants: input.variants as Prisma.InputJsonValue,
      winner: input.winner,
      metrics: input.metrics as Prisma.InputJsonValue | undefined,
    },
  });
}

export function assignExperimentVariant(
  experimentKey: string,
  variants: ExperimentVariant[],
  subjectId: string,
): ExperimentVariant {
  if (variants.length === 0) {
    return { id: "control", name: "Control", weight: 100 };
  }

  const hash = createHash("sha256").update(`${experimentKey}:${subjectId}`).digest();
  const bucket = hash[0] % 100;
  let cursor = 0;
  for (const variant of variants) {
    cursor += variant.weight;
    if (bucket < cursor) return variant;
  }
  return variants[variants.length - 1];
}

export async function resolveActiveExperiments(subjectId: string) {
  const running = await prisma.productExperiment.findMany({ where: { status: "running" } });
  return running.map((exp) => {
    const variants = exp.variants as ExperimentVariant[];
    const assigned = assignExperimentVariant(exp.key, variants, subjectId);
    return { key: exp.key, name: exp.name, variant: assigned };
  });
}
