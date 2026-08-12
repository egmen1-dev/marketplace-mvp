#!/usr/bin/env tsx
/**
 * Taxonomy Import Engine CLI (EPIC-A-005).
 *
 * Default: snapshot + dry-run (safe). Does NOT mass-import WB.
 *
 *   npm run taxonomy:import
 *   npm run taxonomy:import -- --dry-run
 *   npm run taxonomy:import -- --source=snapshot --dry-run
 *   npm run taxonomy:import -- --batch=<id> --apply --auto-approve-safe
 *
 * Live WB fetch (still dry-run unless --apply):
 *   npm run taxonomy:import -- --source=wb --dry-run
 *
 * Mass WB apply requires separate GO — refuse without --i-understand-mass-import
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { prisma } from "../lib/prisma";
import { resolveTaxonomyProvider } from "../lib/catalog-taxonomy/providers";
import {
  applyImportBatch,
  buildImportPlan,
  saveImportBatch,
} from "../lib/catalog-taxonomy/import";

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply || process.argv.includes("--dry-run");
  const autoApproveSafe = process.argv.includes("--auto-approve-safe");
  const massOk = process.argv.includes("--i-understand-mass-import");
  const batchIdArg = argValue("--batch");
  const sourceArg = (argValue("--source") ?? "snapshot").toLowerCase();

  if (apply && sourceArg === "wb" && !massOk) {
    console.error(
      "[taxonomy:import] Refusing WB --apply without --i-understand-mass-import (separate GO required).",
    );
    process.exitCode = 2;
    return;
  }

  if (apply && batchIdArg) {
    console.log(`[taxonomy:import] apply batch=${batchIdArg}`);
    const report = await applyImportBatch(prisma, batchIdArg, {
      autoApproveSafe,
    });
    console.log("[taxonomy:import] apply report:", report);
    return;
  }

  const preferSnapshot = sourceArg !== "wb";
  if (sourceArg === "wb") {
    console.warn(
      "[taxonomy:import] WARNING: live WB source (capped). Default remains dry-run.",
    );
  }

  const provider = resolveTaxonomyProvider({ preferSnapshot });
  console.log(`[taxonomy:import] provider=${provider.name} dryRun=${dryRun || !apply}`);

  const taxonomy = await provider.fetchTaxonomy();
  const plan = await buildImportPlan(prisma, taxonomy);

  console.log(`
Import summary:
  source:       ${plan.source}
  version:      ${plan.version}
  hash:         ${plan.hash.slice(0, 12)}…
  Created:      ${plan.statistics.created}
  Updated:      ${plan.statistics.updated}
  Duplicates:   ${plan.statistics.duplicates}
  Need review:  ${plan.statistics.needReview}
  Rejected:     ${plan.statistics.rejected}
  Skipped:      ${plan.statistics.skipped}
  Char maps:    ${plan.statistics.characteristicMaps}
  SEO cat paths:${plan.seoPaths.categoryPaths.length}
  SEO type paths:${plan.seoPaths.productTypePaths.length}
`);

  const { batchId } = await saveImportBatch(prisma, plan, {
    createdBy: "cli",
  });
  console.log(`[taxonomy:import] batch saved id=${batchId} status=PENDING`);

  const sample = plan.items
    .filter((i) => i.action !== "SKIP")
    .slice(0, 15);
  for (const s of sample) {
    console.log(
      `  - [${s.action}/${s.status}] ${s.entityType} conf=${s.confidence.toFixed(2)} ${s.reason ?? ""}`,
    );
  }

  if (!apply) {
    console.log("[taxonomy:import] dry-run complete — Catalog Core unchanged.");
    return;
  }

  console.log("[taxonomy:import] applying approved/safe items…");
  const report = await applyImportBatch(prisma, batchId, {
    autoApproveSafe: autoApproveSafe || true,
  });
  console.log("[taxonomy:import] apply report:", report);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
