import { prisma } from "@/lib/prisma";

import type { FinancialEngineContext, FinancialEnginePhase } from "./types";

export async function writeFinancialAuditLog(input: {
  context: FinancialEngineContext;
  phase: FinancialEnginePhase;
  outcome: "ok" | "fail" | "skip";
  detail?: Record<string, unknown>;
}): Promise<string> {
  const client = prisma as unknown as {
    financialAuditLog?: { create: typeof prisma.financialAuditLog.create };
  };
  if (!client.financialAuditLog) {
    return "audit_skipped";
  }

  const row = await client.financialAuditLog.create({
    data: {
      operationType: input.context.operationType,
      phase: input.phase,
      outcome: input.outcome,
      idempotencyKey: input.context.idempotencyKey,
      userId: input.context.userId,
      sellerId: input.context.sellerId,
      orderId: input.context.orderId,
      referenceType: input.context.referenceType,
      referenceId: input.context.referenceId,
      detail: input.detail ?? undefined,
    },
  });
  return row.id;
}
