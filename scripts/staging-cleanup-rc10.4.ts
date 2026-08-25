#!/usr/bin/env tsx
/**
 * Staging operator cleanup for rc104-* acceptance fixtures.
 * Dry-run by default; pass --confirm to mutate.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { prisma } from "@/lib/prisma";

const PREFIX = "rc104-";
const OUT = resolve("artifacts/staging-stability/cleanup-rc10.4.json");

function parseArgs() {
  const confirm = process.argv.includes("--confirm");
  const dryRun = !confirm;
  return { confirm, dryRun };
}

function assertStagingOnly() {
  const base = process.env.STAGING_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const railway = process.env.RAILWAY_ENVIRONMENT ?? "";
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isStaging =
    base.includes("railway.app") ||
    base.includes("localhost") ||
    railway.toLowerCase() === "staging" ||
    nodeEnv === "test" ||
    Boolean(process.env.DATABASE_URL?.includes("railway"));
  if (!isStaging && nodeEnv === "production") {
    throw new Error("Refusing cleanup: environment does not look like staging");
  }
}

async function countPending() {
  return prisma.productModeration.count({
    where: { status: "PENDING_REVIEW" },
  });
}

async function main() {
  assertStagingOnly();
  const { dryRun } = parseArgs();
  mkdirSync(resolve("artifacts/staging-stability"), { recursive: true });

  const beforePending = await countPending();
  const fixtures = await prisma.product.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true, name: true, sellerId: true },
  });

  const report = {
    generatedAt: new Date().toISOString(),
    prefix: PREFIX,
    dryRun,
    fixturesFound: fixtures.length,
    moderationPendingBefore: beforePending,
    sample: fixtures.slice(0, 10).map((p) => ({ id: p.id, name: p.name })),
  };

  if (dryRun) {
    const out = {
      ...report,
      moderationPendingAfter: beforePending,
      fixturesRemoved: 0,
      verdict: "DRY_RUN",
      hint: "Re-run with --confirm to delete rc104-* fixtures only",
    };
    writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  let removed = 0;
  for (const product of fixtures) {
    await prisma.$transaction(async (tx) => {
      await tx.productModerationAuditEvent.deleteMany({ where: { productId: product.id } });
      await tx.productModeration.deleteMany({ where: { productId: product.id } });
      await tx.moderationQueueItem.deleteMany({
        where: { entityId: product.id, type: "PRODUCT" },
      });
      await tx.product.delete({ where: { id: product.id } });
    });
    removed += 1;
  }

  const afterPending = await countPending();
  const out = {
    ...report,
    fixturesRemoved: removed,
    moderationPendingAfter: afterPending,
    verdict: "PASS",
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
