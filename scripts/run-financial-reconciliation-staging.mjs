#!/usr/bin/env node
/**
 * Run financial reconciliation against staging DB via Railway.
 * Usage: railway run --service web-v2 -- node scripts/run-financial-reconciliation-staging.mjs
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function runLocal() {
  const { runFinancialReconciliation } = await import(
    "../lib/financial/reconciliation.ts"
  );
  const report = await runFinancialReconciliation();
  console.log(JSON.stringify(report, null, 2));
  const ok =
    report.ledgerMismatch === 0 &&
    report.negativeSpendable === 0 &&
    report.negativeWithdrawable === 0 &&
    report.negativeHeld === 0 &&
    report.duplicateIdempotencyKeys === 0 &&
    report.payoutOverWithdrawable === 0 &&
    report.completedPayoutWithReserved === 0 &&
    report.walletPurchaseWithoutLedger === 0 &&
    report.issues.length === 0;
  process.exit(ok ? 0 : 1);
}

runLocal().catch((err) => {
  console.error(err);
  process.exit(1);
});
