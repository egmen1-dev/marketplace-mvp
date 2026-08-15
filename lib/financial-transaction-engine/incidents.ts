import {
  FinancialIncidentSeverity,
  FinancialIncidentStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { FinancialOperationType } from "./types";

export type CreateFinancialIncidentInput = {
  severity: FinancialIncidentSeverity;
  title: string;
  description: string;
  cause?: string;
  affectedSummary?: string;
  remediation?: string;
  operationType?: FinancialOperationType;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
};

export async function createFinancialIncident(
  input: CreateFinancialIncidentInput,
): Promise<string> {
  const client = prisma as unknown as {
    financialIncident?: { create: typeof prisma.financialIncident.create };
  };
  if (!client.financialIncident) {
    return "incident_skipped";
  }

  const row = await client.financialIncident.create({
    data: {
      severity: input.severity,
      status: FinancialIncidentStatus.OPEN,
      title: input.title,
      description: input.description,
      cause: input.cause,
      affectedSummary: input.affectedSummary,
      remediation: input.remediation,
      operationType: input.operationType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return row.id;
}

export async function listFinancialIncidents(limit = 100) {
  return prisma.financialIncident.findMany({
    orderBy: [{ status: "asc" }, { severity: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function countOpenIncidentsBySeverity() {
  const rows = await prisma.financialIncident.groupBy({
    by: ["severity"],
    where: { status: { in: ["OPEN", "INVESTIGATING"] } },
    _count: { severity: true },
  });
  return Object.fromEntries(
    rows.map((r) => [r.severity, r._count.severity]),
  ) as Record<string, number>;
}
