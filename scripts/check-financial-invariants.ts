#!/usr/bin/env tsx
/**
 * Daily finance invariant check — run against staging/production DB via DATABASE_URL.
 * Usage: npm run finance:invariants
 */
import { FinancialIncidentSeverity, FinancialIncidentStatus } from "@prisma/client";

import { runFinancialReconciliation } from "@/lib/financial/reconciliation";
import { prisma } from "@/lib/prisma";

async function main() {
  const reconciliation = await runFinancialReconciliation();

  const [
    ordersChecked,
    financeTransactionsChecked,
    walletEntriesChecked,
    payoutsChecked,
    openCriticalIncidents,
  ] = await Promise.all([
    prisma.order.count({ where: { payment: { status: "SUCCEEDED" } } }),
    prisma.financeTransaction.count(),
    prisma.walletLedgerEntry.count(),
    prisma.payoutRequest.count(),
    prisma.financialIncident.count({
      where: {
        severity: FinancialIncidentSeverity.CRITICAL,
        status: { in: [FinancialIncidentStatus.OPEN, FinancialIncidentStatus.INVESTIGATING] },
      },
    }),
  ]);

  const issues = [...reconciliation.issues];
  if (openCriticalIncidents > 0) {
    issues.push(`open CRITICAL financial incidents: ${openCriticalIncidents}`);
  }

  const report = {
    checkedAt: new Date().toISOString(),
    usersChecked: reconciliation.usersChecked,
    ordersChecked,
    financeTransactionsChecked,
    walletEntriesChecked,
    payoutsChecked,
    negativeSpendable: reconciliation.negativeSpendable,
    negativeWithdrawable: reconciliation.negativeWithdrawable,
    negativeHeld: reconciliation.negativeHeld,
    ledgerMismatches: reconciliation.ledgerMismatch,
    orphanTransactions: reconciliation.walletPurchaseWithoutLedger,
    duplicateIdempotencyKeys: reconciliation.duplicateIdempotencyKeys,
    payoutOverWithdrawable: reconciliation.payoutOverWithdrawable,
    completedPayoutWithReserved: reconciliation.completedPayoutWithReserved,
    openCriticalIncidents,
    issues,
    ok: issues.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  process.exit(report.ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
