/**
 * Apply approved import batch → Catalog Core (sync + unify + optional merges).
 * Idempotent: re-applying APPLIED batch is a no-op.
 */

import type { PrismaClient } from "@prisma/client";

import { invalidateTaxonomyCache } from "../cache";
import { mergeProductTypeDuplicate } from "../dedupe";
import { syncTaxonomyToDb } from "../sync";
import type { NormalizedTaxonomy } from "../types";
import { unifyCatalogCore } from "../unify";
import {
  approveAllPendingSafe,
  getImportBatch,
  markBatchStatus,
} from "./batch";
import type { ApplyReport } from "./types";

export async function applyImportBatch(
  db: PrismaClient,
  batchId: string,
  options?: {
    autoApproveSafe?: boolean;
  },
): Promise<ApplyReport> {
  const batch = await getImportBatch(db, batchId);
  if (!batch) {
    throw new Error(`Import batch not found: ${batchId}`);
  }
  if (batch.status === "APPLIED") {
    return {
      batchId,
      appliedItems: 0,
      sync: null,
      unify: null,
      merges: 0,
      dryRun: false,
    };
  }
  if (batch.status === "REJECTED") {
    throw new Error("Cannot apply REJECTED batch");
  }

  if (options?.autoApproveSafe) {
    await approveAllPendingSafe(db, batchId);
  }

  const fresh = await getImportBatch(db, batchId);
  if (!fresh) throw new Error("Batch vanished");

  const approved = fresh.items.filter((i) => i.status === "APPROVED");

  const meta = (fresh.meta ?? {}) as { taxonomy?: NormalizedTaxonomy };
  const taxonomy = meta.taxonomy ?? null;

  let syncStats: Record<string, number | string> | null = null;
  let unifyStats: Record<string, number> | null = null;

  if (taxonomy) {
    const approvedExt = new Set(
      approved
        .filter(
          (i) =>
            (i.entityType === "PRODUCT_TYPE" || i.entityType === "CATEGORY") &&
            (i.action === "CREATE" || i.action === "UPDATE"),
        )
        .map((i) => i.externalId)
        .filter((x): x is string => Boolean(x)),
    );

    // Include ancestor categories for approved product types
    const neededCatKeys = new Set<string>();
    for (const pt of taxonomy.productTypes) {
      if (approvedExt.has(pt.externalId)) neededCatKeys.add(pt.categoryKey);
    }
    for (const cat of taxonomy.categories) {
      if (approvedExt.has(cat.externalId)) neededCatKeys.add(cat.key);
    }
    // Walk parents
    let changed = true;
    while (changed) {
      changed = false;
      for (const cat of taxonomy.categories) {
        if (neededCatKeys.has(cat.key) && cat.parentKey && !neededCatKeys.has(cat.parentKey)) {
          neededCatKeys.add(cat.parentKey);
          changed = true;
        }
      }
    }

    const filtered: NormalizedTaxonomy = {
      ...taxonomy,
      categories: taxonomy.categories.filter((c) => neededCatKeys.has(c.key)),
      productTypes: taxonomy.productTypes.filter((pt) =>
        approvedExt.has(pt.externalId),
      ),
    };

    if (filtered.productTypes.length > 0 || filtered.categories.length > 0) {
      const stats = await syncTaxonomyToDb(db, filtered, {
        deactivateMissing: false,
      });
      syncStats = stats as unknown as Record<string, number | string>;
      const unify = await unifyCatalogCore(db);
      unifyStats = unify as unknown as Record<string, number>;
    }
  }

  let merges = 0;
  for (const item of approved.filter((i) => i.action === "MERGE")) {
    const oldV = item.oldValue as {
      primaryId?: string;
    } | null;
    const newV = item.newValue as { duplicateId?: string } | null;
    if (oldV?.primaryId && newV?.duplicateId) {
      await mergeProductTypeDuplicate(db, oldV.primaryId, newV.duplicateId);
      merges += 1;
    }
  }

  await db.taxonomyImportItem.updateMany({
    where: { batchId, status: "APPROVED" },
    data: { status: "APPLIED" },
  });
  await markBatchStatus(db, batchId, "APPLIED");
  invalidateTaxonomyCache();

  return {
    batchId,
    appliedItems: approved.length,
    sync: syncStats,
    unify: unifyStats,
    merges,
    dryRun: false,
  };
}
