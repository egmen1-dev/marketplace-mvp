#!/usr/bin/env tsx
/**
 * Sync taxonomy from WB API (if WB_API_TOKEN set) or the local snapshot.
 *
 * Usage:
 *   npm run taxonomy:sync                       # snapshot, safe merge
 *   npm run taxonomy:sync -- --deactivate-missing
 *   npm run taxonomy:sync:wb                     # live WB API (needs token)
 *   npm run taxonomy:migrate -- --apply
 *
 * Records a TaxonomySyncRun row and writes docs/TAXONOMY_SYNC_REPORT.md.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../lib/prisma";
import { resolveTaxonomyProvider } from "../lib/catalog-taxonomy/providers";
import { syncTaxonomyToDb } from "../lib/catalog-taxonomy/sync";
import { migrateExistingProducts } from "../lib/catalog-taxonomy/migration";

async function counts() {
  const [categories, productTypes, characteristics, aliases] = await Promise.all([
    prisma.category.count(),
    prisma.productType.count(),
    prisma.productCharacteristicDefinition.count(),
    prisma.productTypeAlias.count(),
  ]);
  return { categories, productTypes, characteristics, aliases };
}

async function main() {
  const preferSnapshot =
    process.env.TAXONOMY_PREFER_SNAPSHOT === "1" ||
    process.argv.includes("--snapshot");
  const deactivateMissing = process.argv.includes("--deactivate-missing");
  const runMigrate = process.argv.includes("--migrate");
  const applyMigrate = process.argv.includes("--apply");

  const provider = resolveTaxonomyProvider({ preferSnapshot });
  const mode = provider.name === "wildberries" ? "live" : "snapshot";
  console.log(`[taxonomy:sync] provider=${provider.name} mode=${mode}`);

  const run = await prisma.taxonomySyncRun.create({
    data: { source: provider.name, mode, status: "RUNNING" },
  });
  const started = Date.now();

  try {
    const before = await counts();
    const taxonomy = await provider.fetchTaxonomy();
    console.log(
      `[taxonomy:sync] fetched categories=${taxonomy.categories.length} productTypes=${taxonomy.productTypes.length}`,
    );

    const stats = await syncTaxonomyToDb(prisma, taxonomy, { deactivateMissing });
    console.log("[taxonomy:sync] upsert stats:", stats);

    const after = await counts();
    const createdCategories = Math.max(0, after.categories - before.categories);
    const createdTypes = Math.max(0, after.productTypes - before.productTypes);
    const durationMs = Date.now() - started;

    let migrateLine = "";
    if (runMigrate) {
      const report = await migrateExistingProducts(prisma, { apply: applyMigrate });
      migrateLine = `mapped=${report.mapped} needs_review=${report.needsReview} unmapped=${report.unmapped} apply=${applyMigrate}`;
      console.log(`[taxonomy:migrate] ${migrateLine}`);
    }

    await prisma.taxonomySyncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        categoriesImported: stats.categoriesUpserted,
        productTypesImported: stats.productTypesUpserted,
        characteristicsImported: stats.characteristicsUpserted,
        aliasesImported: stats.aliasesUpserted,
        created: createdCategories + createdTypes,
        updated: Math.max(
          0,
          stats.categoriesUpserted +
            stats.productTypesUpserted -
            createdCategories -
            createdTypes,
        ),
        deactivated:
          stats.categoriesDeactivated + stats.productTypesDeactivated,
        durationMs,
        finishedAt: new Date(),
      },
    });

    const report = [
      "# TAXONOMY SYNC REPORT",
      "",
      `- source: **${provider.name}**`,
      `- mode: **${mode}** ${mode === "snapshot" ? "(LOCAL SNAPSHOT — live WB import pending WB_API_TOKEN)" : "(REAL LIVE IMPORT)"}`,
      `- syncedAt: ${new Date().toISOString()}`,
      `- durationMs: ${durationMs}`,
      "",
      "## Imported",
      "",
      "| Entity | Imported | Created | In DB (after) |",
      "| --- | --- | --- | --- |",
      `| Categories | ${stats.categoriesUpserted} | ${createdCategories} | ${after.categories} |`,
      `| Product types | ${stats.productTypesUpserted} | ${createdTypes} | ${after.productTypes} |`,
      `| Characteristics | ${stats.characteristicsUpserted} | — | ${after.characteristics} |`,
      `| Aliases | ${stats.aliasesUpserted} | — | ${after.aliases} |`,
      "",
      `- deactivated (source-removed): ${stats.categoriesDeactivated + stats.productTypesDeactivated}`,
      `- errors: 0`,
      runMigrate ? `\n## Product migration\n\n- ${migrateLine}` : "",
      "",
      "> Idempotent: re-running with an unchanged source does not increase entity counts.",
      "",
    ].join("\n");

    const outPath = path.join(process.cwd(), "docs/TAXONOMY_SYNC_REPORT.md");
    writeFileSync(outPath, report, "utf8");
    console.log(`[taxonomy:sync] wrote ${outPath}`);
  } catch (err) {
    await prisma.taxonomySyncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorText: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
        finishedAt: new Date(),
      },
    });
    throw err;
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
