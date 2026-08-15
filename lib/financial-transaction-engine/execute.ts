import { FinancialIncidentSeverity } from "@prisma/client";

import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { writeFinancialAuditLog } from "./audit";
import { createFinancialIncident } from "./incidents";
import type {
  FinancialEngineContext,
  FinancialEngineHandlers,
  FinancialEngineResult,
} from "./types";
import { FinancialVerificationError } from "./types";

/**
 * Validate → Lock → Execute → Verify → Commit → Audit
 *
 * Execute + Verify run inside a single DB transaction (atomic commit).
 * Post-commit audit is append-only; verification failure rolls back.
 */
export async function executeFinancialTransaction<T>(
  context: FinancialEngineContext,
  handlers: FinancialEngineHandlers<T>,
): Promise<FinancialEngineResult<T>> {
  const auditIds: string[] = [];

  try {
    if (handlers.validate) {
      await handlers.validate();
      auditIds.push(
        await writeFinancialAuditLog({
          context,
          phase: "validate",
          outcome: "ok",
        }),
      );
    }

    const value = await prisma.$transaction(async (tx) => {
      if (handlers.lock) {
        await handlers.lock(tx);
        await writeFinancialAuditLog({
          context,
          phase: "lock",
          outcome: "ok",
        });
      }

      const result = await handlers.execute(tx);

      if (handlers.verify) {
        await handlers.verify(tx, result);
      }

      return result;
    });

    auditIds.push(
      await writeFinancialAuditLog({
        context,
        phase: "commit",
        outcome: "ok",
        detail: { duplicate: (value as { duplicate?: boolean }).duplicate },
      }),
    );

    auditIds.push(
      await writeFinancialAuditLog({
        context,
        phase: "audit",
        outcome: "ok",
      }),
    );

    const duplicate =
      typeof value === "object" &&
      value !== null &&
      "duplicate" in value &&
      Boolean((value as { duplicate?: boolean }).duplicate);

    return { ok: true, value, duplicate, auditIds };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "financial_transaction_failed";

    auditIds.push(
      await writeFinancialAuditLog({
        context,
        phase: "verify",
        outcome: "fail",
        detail: { message },
      }),
    );

    log.error("financial_transaction_failed", {
      operationType: context.operationType,
      idempotencyKey: context.idempotencyKey,
      message,
    });

    let incidentId: string | undefined;
    if (err instanceof FinancialVerificationError) {
      incidentId = await createFinancialIncident({
        severity: FinancialIncidentSeverity.CRITICAL,
        title: `Verification failed: ${context.operationType}`,
        description: message,
        cause: "Post-execute invariant check failed inside transaction",
        affectedSummary: [
          context.userId ? `user=${context.userId}` : null,
          context.orderId ? `order=${context.orderId}` : null,
          context.sellerId ? `seller=${context.sellerId}` : null,
        ]
          .filter(Boolean)
          .join(", "),
        remediation:
          "Inspect wallet ledger, order payment, seller balance. Re-run reconciliation.",
        operationType: context.operationType,
        referenceType: context.referenceType,
        referenceId: context.referenceId,
        metadata: { idempotencyKey: context.idempotencyKey },
      });
    }

    return {
      ok: false,
      error: message,
      code: err instanceof FinancialVerificationError ? "VERIFICATION_FAILED" : undefined,
      incidentId,
      auditIds,
    };
  }
}
