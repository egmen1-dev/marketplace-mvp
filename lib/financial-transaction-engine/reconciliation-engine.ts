import { FinancialIncidentSeverity } from "@prisma/client";

import {
  runFinancialReconciliation,
  type FinancialReconciliationReport,
} from "@/lib/financial/reconciliation";

import { createFinancialIncident } from "./incidents";

export type ReconciliationEngineReport = FinancialReconciliationReport & {
  incidentsCreated: number;
  incidentIds: string[];
};

/** Run reconciliation and open incidents for every drift detected. */
export async function runReconciliationEngine(): Promise<ReconciliationEngineReport> {
  const report = await runFinancialReconciliation();
  const incidentIds: string[] = [];

  if (report.issues.length === 0) {
    return { ...report, incidentsCreated: 0, incidentIds };
  }

  const severity =
    report.ledgerMismatch > 0 || report.walletPurchaseWithoutLedger > 0
      ? FinancialIncidentSeverity.CRITICAL
      : report.duplicateIdempotencyKeys > 0
        ? FinancialIncidentSeverity.HIGH
        : FinancialIncidentSeverity.MEDIUM;

  const id = await createFinancialIncident({
    severity,
    title: "Financial reconciliation drift detected",
    description: report.issues.slice(0, 20).join("\n"),
    cause: "Automated reconciliation found ledger/balance/order mismatches",
    affectedSummary: `${report.issues.length} issue(s), ${report.usersChecked} wallets checked`,
    remediation:
      "Run finance:invariants, inspect affected users/orders, halt payouts until resolved.",
    operationType: undefined,
    metadata: {
      ledgerMismatch: report.ledgerMismatch,
      duplicateIdempotencyKeys: report.duplicateIdempotencyKeys,
      walletPurchaseWithoutLedger: report.walletPurchaseWithoutLedger,
    },
  });
  incidentIds.push(id);

  return {
    ...report,
    incidentsCreated: incidentIds.length,
    incidentIds,
  };
}
