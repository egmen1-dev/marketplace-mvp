#!/usr/bin/env tsx
/**
 * Sync taxonomy from WB API (if WB_API_TOKEN set) or local snapshot.
 *
 * Usage:
 *   npm run taxonomy:sync
 *   TAXONOMY_PREFER_SNAPSHOT=1 npm run taxonomy:sync
 *   npm run taxonomy:migrate -- --apply
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { prisma } from "../lib/prisma";
import { resolveTaxonomyProvider } from "../lib/catalog-taxonomy/providers";
import { syncTaxonomyToDb } from "../lib/catalog-taxonomy/sync";
import { unifyCatalogCore } from "../lib/catalog-taxonomy/unify";
import { migrateExistingProducts } from "../lib/catalog-taxonomy/migration";

async function main() {
  const preferSnapshot =
    process.env.TAXONOMY_PREFER_SNAPSHOT === "1" ||
    process.argv.includes("--snapshot");
  const runMigrate = process.argv.includes("--migrate");
  const applyMigrate = process.argv.includes("--apply");

  const provider = resolveTaxonomyProvider({ preferSnapshot });
  console.log(`[taxonomy:sync] provider=${provider.name}`);

  const taxonomy = await provider.fetchTaxonomy();
  console.log(
    `[taxonomy:sync] categories=${taxonomy.categories.length} productTypes=${taxonomy.productTypes.length}`,
  );

  const stats = await syncTaxonomyToDb(prisma, taxonomy, {
    deactivateMissing: false, // safer default for snapshot merge with existing LOT cats
  });
  console.log("[taxonomy:sync] upsert stats:", stats);

  const unify = await unifyCatalogCore(prisma);
  console.log("[taxonomy:sync] unify stats:", unify);

  if (runMigrate) {
    const report = await migrateExistingProducts(prisma, {
      apply: applyMigrate,
    });
    console.log(
      `[taxonomy:migrate] mapped=${report.mapped} needs_review=${report.needsReview} unmapped=${report.unmapped} apply=${applyMigrate}`,
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
