/**
 * Generate the LocalSnapshotProvider JSON from the curated TypeScript taxonomy.
 *
 * Run: npm run taxonomy:build-snapshot
 *
 * The TS module (lib/catalog-taxonomy/data/lot-taxonomy.ts) is the source of
 * truth; this script serializes it to data/taxonomy/wb-taxonomy.json so the
 * runtime snapshot provider and seed stay in sync with a single definition.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildLotTaxonomy,
  lotTaxonomyStats,
} from "../lib/catalog-taxonomy/data/lot-taxonomy";

function main() {
  const taxonomy = buildLotTaxonomy();
  // Freeze fetchedAt so the file is stable across rebuilds (idempotent output).
  taxonomy.fetchedAt = "2026-08-11T00:00:00.000Z";

  const outPath = path.join(process.cwd(), "data/taxonomy/wb-taxonomy.json");
  writeFileSync(outPath, `${JSON.stringify(taxonomy, null, 2)}\n`, "utf8");

  const stats = lotTaxonomyStats(taxonomy);
  console.log(`Wrote ${outPath}`);
  console.log(
    `categories=${stats.categories} productTypes=${stats.productTypes} characteristics=${stats.characteristics} aliases=${stats.aliases}`,
  );
}

main();
