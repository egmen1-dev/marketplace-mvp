#!/usr/bin/env tsx
import { runReconciliationEngine } from "@/lib/financial-transaction-engine";
import { prisma } from "@/lib/prisma";

async function main() {
  const report = await runReconciliationEngine();
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  process.exit(report.issues.length === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
