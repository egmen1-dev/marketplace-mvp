#!/usr/bin/env tsx
/**
 * ProductType dedupe CLI.
 *
 *   npm run taxonomy:dedupe
 *   npm run taxonomy:dedupe -- --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { prisma } from "../lib/prisma";
import { dedupeProductTypes } from "../lib/catalog-taxonomy/dedupe";

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  console.log(`[taxonomy:dedupe] dryRun=${dryRun}`);
  const report = await dedupeProductTypes(prisma, {
    dryRun,
    applyAll: apply,
  });

  console.log(
    `[taxonomy:dedupe] groups=${report.groups} candidates=${report.candidates.length} applied=${report.applied}`,
  );

  for (const c of report.candidates) {
    console.log(
      `- ${c.reason}: KEEP ${c.primaryName} (${c.primarySlug}, ${c.primarySource}, products=${c.primaryProducts}) ← MERGE ${c.duplicateName} (${c.duplicateSlug}, ${c.duplicateSource}, products=${c.duplicateProducts}) [${c.decision}]`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
