#!/usr/bin/env tsx
/** Resolve historical test-generated financial incidents (chaos/stress verification failures). */
import { FinancialIncidentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

async function main() {
  const result = await prisma.financialIncident.updateMany({
    where: {
      status: { in: [FinancialIncidentStatus.OPEN, FinancialIncidentStatus.INVESTIGATING] },
      title: { contains: "Verification failed" },
    },
    data: {
      status: FinancialIncidentStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });
  console.log(`Resolved ${result.count} test verification incidents`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
