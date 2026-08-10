import { NextResponse } from "next/server";

import { resolveTaxonomyProvider } from "@/lib/catalog-taxonomy/providers";
import { syncTaxonomyToDb } from "@/lib/catalog-taxonomy/sync";
import { migrateExistingProducts } from "@/lib/catalog-taxonomy/migration";
import { prisma } from "@/lib/prisma";

/**
 * Staging/ops endpoint to load snapshot (or WB) taxonomy.
 * Auth: Authorization: Bearer $TAXONOMY_SYNC_SECRET or $CRON_SECRET
 */
export async function POST(request: Request) {
  const secret =
    process.env.TAXONOMY_SYNC_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferSnapshot =
    new URL(request.url).searchParams.get("provider") !== "wb";

  try {
    const provider = resolveTaxonomyProvider({ preferSnapshot });
    const taxonomy = await provider.fetchTaxonomy();
    const stats = await syncTaxonomyToDb(prisma, taxonomy, {
      deactivateMissing: false,
    });

    const migrate =
      new URL(request.url).searchParams.get("migrate") === "1";
    const report = migrate
      ? await migrateExistingProducts(prisma, { apply: false })
      : null;

    return NextResponse.json({
      ok: true,
      provider: provider.name,
      stats,
      migrationDryRun: report
        ? {
            mapped: report.mapped,
            needsReview: report.needsReview,
            unmapped: report.unmapped,
          }
        : null,
    });
  } catch (err) {
    console.error("[taxonomy/sync]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 },
    );
  }
}
