#!/usr/bin/env tsx
/**
 * Staging-only cleanup for RC10.4 moderation acceptance fixtures.
 * Deletes ONLY products whose title starts with `rc104-`.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { prisma } from "@/lib/prisma";

const PREFIX = "rc104-";
const ALLOWED_SELLER_EMAILS = new Set([
  process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot",
  process.env.MOBILE_SELLER_B_EMAIL ?? "seller2@demo.lot",
]);
const OUT = resolve("artifacts/closed-beta-rc10.4/cleanup-acceptance.json");

function assertStagingOnly() {
  const base = process.env.STAGING_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const railway = process.env.RAILWAY_ENVIRONMENT ?? "";
  const isStaging =
    base.includes("railway.app") ||
    base.includes("localhost") ||
    railway.toLowerCase() === "staging" ||
    nodeEnv === "test";
  if (!isStaging) {
    throw new Error(
      `Refusing cleanup: environment does not look like staging (STAGING_BASE_URL=${base || "unset"})`,
    );
  }
}

async function main() {
  assertStagingOnly();
  mkdirSync(resolve("artifacts/closed-beta-rc10.4"), { recursive: true });

  const sellers = await prisma.sellerProfile.findMany({
    where: { user: { email: { in: [...ALLOWED_SELLER_EMAILS] } } },
    select: { id: true, user: { select: { email: true } } },
  });
  const sellerIds = sellers.map((s) => s.id);

  const beforePending = await prisma.productModeration.count({
    where: { status: "PENDING_REVIEW" },
  });

  const fixtures = await prisma.product.findMany({
    where: {
      sellerId: { in: sellerIds },
      name: { startsWith: PREFIX },
    },
    select: { id: true, name: true, sellerId: true },
  });

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

  const afterPending = await prisma.productModeration.count({
    where: { status: "PENDING_REVIEW" },
  });

  const report = {
    generatedAt: new Date().toISOString(),
    prefix: PREFIX,
    sellerEmails: [...ALLOWED_SELLER_EMAILS],
    fixturesFound: fixtures.length,
    fixturesRemoved: removed,
    moderationPendingBefore: beforePending,
    moderationPendingAfter: afterPending,
    sampleRemoved: fixtures.slice(0, 10).map((p) => ({ id: p.id, name: p.name })),
    verdict: "PASS",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
