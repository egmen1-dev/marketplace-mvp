/**
 * Map existing products (without a ProductType) onto the taxonomy by title.
 * Splits into AUTO_MATCHED_HIGH_CONFIDENCE / REVIEW_REQUIRED / UNMATCHED and
 * only applies high-confidence matches (section 42). Writes a report doc.
 *
 * Run: npm run taxonomy:migrate-products -- --apply
 */
import { config } from "dotenv";
config({ path: ".env" });

import { writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../lib/prisma";
import { migrateExistingProducts } from "../lib/catalog-taxonomy/migration";

async function main() {
  const apply = process.argv.includes("--apply");

  const report = await migrateExistingProducts(prisma, {
    apply,
    minConfidence: 0.45,
    reviewThreshold: 0.7,
  });

  const sample = report.rows
    .slice()
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 25)
    .map(
      (r) =>
        `| ${r.productName.slice(0, 40)} | ${r.status} | ${r.productTypeName ?? "—"} | ${
          r.confidence != null ? r.confidence.toFixed(2) : "—"
        } |`,
    );

  const md = [
    "# PRODUCT TAXONOMY MIGRATION REPORT",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- apply: **${apply}** (only AUTO_MATCHED_HIGH_CONFIDENCE applied)`,
    "",
    "## Summary",
    "",
    "| Bucket | Count |",
    "| --- | --- |",
    `| AUTO_MATCHED_HIGH_CONFIDENCE (mapped) | ${report.mapped} |`,
    `| REVIEW_REQUIRED (needs_review) | ${report.needsReview} |`,
    `| UNMATCHED | ${report.unmapped} |`,
    `| Total processed | ${report.rows.length} |`,
    "",
    "## Sample (top 25 by confidence)",
    "",
    "| Product | Bucket | Matched ProductType | Confidence |",
    "| --- | --- | --- | --- |",
    ...sample,
    "",
    "> Existing products are never broken: productTypeId stays null when uncertain;",
    "> REVIEW_REQUIRED rows are left for admin review, not auto-applied.",
    "",
  ].join("\n");

  const outPath = path.join(
    process.cwd(),
    "docs/PRODUCT_TAXONOMY_MIGRATION_REPORT.md",
  );
  writeFileSync(outPath, md, "utf8");
  console.log(
    `[migrate-products] mapped=${report.mapped} needs_review=${report.needsReview} unmapped=${report.unmapped} apply=${apply}`,
  );
  console.log(`[migrate-products] wrote ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
