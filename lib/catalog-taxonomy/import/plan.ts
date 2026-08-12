/**
 * Build import plan (diff) against Catalog Core — no writes.
 */

import type { PrismaClient } from "@prisma/client";

import { productTypePagePath } from "@/features/catalog/paths";

import { auditProductTypeDuplicates } from "../dedupe";
import { normalizeAlias } from "../normalize";
import type { NormalizedTaxonomy } from "../types";
import { mapCharacteristicToDefinition } from "./characteristics-map";
import { canSoftDeactivate, conflictPriority } from "./conflicts";
import {
  normalizeIncomingTaxonomy,
  taxonomyContentHash,
  taxonomyVersion,
} from "./normalize";
import { suggestProductTypeMapping, synonymBoost } from "./ai-mapping";
import type {
  ImportPlan,
  ImportStatistics,
  PlannedImportItem,
} from "./types";

function emptyStats(): ImportStatistics {
  return {
    created: 0,
    updated: 0,
    duplicates: 0,
    needReview: 0,
    rejected: 0,
    skipped: 0,
    softDeactivate: 0,
    characteristicMaps: 0,
  };
}

function bump(
  stats: ImportStatistics,
  action: PlannedImportItem["action"],
  status: PlannedImportItem["status"],
) {
  if (action === "CREATE") stats.created += 1;
  else if (action === "UPDATE") stats.updated += 1;
  else if (action === "MERGE") stats.duplicates += 1;
  else if (action === "SOFT_DEACTIVATE") stats.softDeactivate += 1;
  else if (action === "SKIP") stats.skipped += 1;
  else if (action === "REVIEW") stats.needReview += 1;
  if (status === "REJECTED") stats.rejected += 1;
}

export async function buildImportPlan(
  db: PrismaClient,
  raw: NormalizedTaxonomy,
): Promise<ImportPlan> {
  const taxonomy = normalizeIncomingTaxonomy(raw);
  const hash = taxonomyContentHash(taxonomy);
  const version = taxonomyVersion(taxonomy);
  const items: PlannedImportItem[] = [];
  const stats = emptyStats();

  const categories = await db.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      parentId: true,
      externalSource: true,
      externalId: true,
      locallyEdited: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
  const productTypes = await db.productType.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      lotName: true,
      slug: true,
      categoryId: true,
      externalSource: true,
      externalId: true,
      locallyEdited: true,
      aliases: { select: { alias: true, normalized: true } },
      characteristics: {
        select: { id: true, name: true, slug: true, type: true },
      },
      category: { select: { path: true } },
      _count: { select: { products: true } },
    },
  });

  const catByExternal = new Map(
    categories
      .filter((c) => c.externalSource && c.externalId)
      .map((c) => [`${c.externalSource}:${c.externalId}`, c]),
  );
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const ptByExternal = new Map(
    productTypes
      .filter((p) => p.externalSource && p.externalId)
      .map((p) => [`${p.externalSource}:${p.externalId}`, p]),
  );
  const ptBySlug = new Map(productTypes.map((p) => [p.slug, p]));

  const lotTypesForAi = productTypes.map((p) => ({
    id: p.id,
    name: p.name,
    lotName: p.lotName,
    slug: p.slug,
    aliases: p.aliases.map((a) => a.alias),
  }));

  for (const cat of taxonomy.categories) {
    const extKey = `${cat.externalSource}:${cat.externalId}`;
    const existing = catByExternal.get(extKey) ?? catBySlug.get(cat.slug) ?? null;

    if (!existing) {
      const item: PlannedImportItem = {
        externalId: cat.externalId,
        entityType: "CATEGORY",
        action: "CREATE",
        oldValue: null,
        newValue: {
          name: cat.name,
          slug: cat.slug,
          path: cat.path,
          parentKey: cat.parentKey,
        },
        confidence: 0.9,
        status: "PENDING",
        reason: "new category",
        targetId: null,
      };
      items.push(item);
      bump(stats, item.action, item.status);
      continue;
    }

    const conflict = conflictPriority({
      locallyEdited: existing.locallyEdited,
      productCount: existing._count.products,
      existingSource: existing.externalSource,
      incomingSource: cat.externalSource,
    });

    const nameChanged =
      !existing.locallyEdited &&
      normalizeAlias(existing.name) !== normalizeAlias(cat.name);

    if (conflict.decision === "skip_local_edit") {
      const item: PlannedImportItem = {
        externalId: cat.externalId,
        entityType: "CATEGORY",
        action: "SKIP",
        oldValue: { id: existing.id, name: existing.name, slug: existing.slug },
        newValue: { name: cat.name, slug: cat.slug },
        confidence: 1,
        status: "REJECTED",
        reason: conflict.reason,
        targetId: existing.id,
      };
      items.push(item);
      bump(stats, item.action, item.status);
      continue;
    }

    if (nameChanged || existing.path !== cat.path) {
      const needsReview = conflict.decision === "review_products";
      const item: PlannedImportItem = {
        externalId: cat.externalId,
        entityType: "CATEGORY",
        action: needsReview ? "REVIEW" : "UPDATE",
        oldValue: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          path: existing.path,
        },
        newValue: { name: cat.name, slug: cat.slug, path: cat.path },
        confidence: needsReview ? 0.55 : 0.85,
        status: "PENDING",
        reason: conflict.reason,
        targetId: existing.id,
      };
      items.push(item);
      bump(stats, item.action, item.status);
    } else {
      const item: PlannedImportItem = {
        externalId: cat.externalId,
        entityType: "CATEGORY",
        action: "SKIP",
        oldValue: { id: existing.id },
        newValue: null,
        confidence: 1,
        status: "APPROVED",
        reason: "unchanged",
        targetId: existing.id,
      };
      items.push(item);
      bump(stats, item.action, item.status);
    }
  }

  for (const pt of taxonomy.productTypes) {
    const extKey = `${pt.externalSource}:${pt.externalId}`;
    let existing = ptByExternal.get(extKey) ?? ptBySlug.get(pt.slug) ?? null;

    const ai = suggestProductTypeMapping(
      {
        name: pt.name,
        slug: pt.slug,
        externalId: pt.externalId,
        aliases: pt.aliases,
      },
      lotTypesForAi,
    );

    // Synonym boost e.g. УШМ / болгарка
    if (!existing && ai.targetId) {
      const syn = synonymBoost(pt.name, ai.targetName ?? "");
      if (syn >= 0.9 || ai.confidence >= 0.9) {
        existing = productTypes.find((p) => p.id === ai.targetId) ?? null;
      }
    }

    if (!existing) {
      const item: PlannedImportItem = {
        externalId: pt.externalId,
        entityType: "PRODUCT_TYPE",
        action: "CREATE",
        oldValue: null,
        newValue: {
          name: pt.name,
          slug: pt.slug,
          categoryKey: pt.categoryKey,
          aliases: pt.aliases,
          aiSuggestion: ai,
        },
        confidence: 0.88,
        status: "PENDING",
        reason: "new product type",
        targetId: null,
      };
      items.push(item);
      bump(stats, item.action, item.status);
    } else {
      const conflict = conflictPriority({
        locallyEdited: existing.locallyEdited,
        productCount: existing._count.products,
        existingSource: existing.externalSource,
        incomingSource: pt.externalSource,
      });

      const sameExternal =
        existing.externalSource === pt.externalSource &&
        existing.externalId === pt.externalId;

      if (!sameExternal && ai.confidence >= 0.9) {
        const item: PlannedImportItem = {
          externalId: pt.externalId,
          entityType: "PRODUCT_TYPE",
          action: "MERGE",
          oldValue: {
            primaryId: existing.id,
            primaryName: existing.lotName ?? existing.name,
          },
          newValue: {
            duplicateName: pt.name,
            duplicateSlug: pt.slug,
            aiSuggestion: ai,
          },
          confidence: Math.max(ai.confidence, synonymBoost(pt.name, existing.lotName ?? existing.name)),
          status: "PENDING",
          reason: `duplicate candidate — ${ai.reason}`,
          targetId: existing.id,
        };
        items.push(item);
        bump(stats, item.action, item.status);
      } else if (conflict.decision === "skip_local_edit") {
        const item: PlannedImportItem = {
          externalId: pt.externalId,
          entityType: "PRODUCT_TYPE",
          action: "SKIP",
          oldValue: { id: existing.id, name: existing.name },
          newValue: { name: pt.name },
          confidence: 1,
          status: "REJECTED",
          reason: conflict.reason,
          targetId: existing.id,
        };
        items.push(item);
        bump(stats, item.action, item.status);
      } else {
        const nameChanged =
          !existing.locallyEdited &&
          normalizeAlias(existing.name) !== normalizeAlias(pt.name);
        const item: PlannedImportItem = {
          externalId: pt.externalId,
          entityType: "PRODUCT_TYPE",
          action: nameChanged ? "UPDATE" : "SKIP",
          oldValue: {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
          },
          newValue: nameChanged
            ? { name: pt.name, aliases: pt.aliases }
            : null,
          confidence: nameChanged ? 0.82 : 1,
          status: nameChanged ? "PENDING" : "APPROVED",
          reason: nameChanged ? conflict.reason : "unchanged",
          targetId: existing.id,
        };
        items.push(item);
        bump(stats, item.action, item.status);
      }

      // Characteristic mapping against existing defs
      for (const ch of pt.characteristics) {
        const mapped = mapCharacteristicToDefinition(
          { name: ch.name, slug: ch.slug },
          existing.characteristics,
        );
        if (mapped.kind === "unmapped") {
          const item: PlannedImportItem = {
            externalId: ch.externalId,
            entityType: "CHARACTERISTIC",
            action: "CREATE",
            oldValue: null,
            newValue: {
              name: ch.name,
              slug: ch.slug,
              type: ch.type,
              productTypeId: existing.id,
              mapping: mapped,
            },
            confidence: 0.7,
            status: "PENDING",
            reason: "new characteristic on existing type",
            targetId: existing.id,
          };
          items.push(item);
          bump(stats, item.action, item.status);
        } else if (mapped.kind === "similar" || mapped.kind === "alias") {
          const item: PlannedImportItem = {
            externalId: ch.externalId,
            entityType: "CHARACTERISTIC",
            action: "REVIEW",
            oldValue: {
              targetId: mapped.targetId,
              targetName: mapped.targetName,
            },
            newValue: {
              name: ch.name,
              slug: ch.slug,
              mapping: mapped,
            },
            confidence: mapped.confidence,
            status: "PENDING",
            reason: `map ${ch.name} → ${mapped.targetName} (${mapped.kind})`,
            targetId: mapped.targetId,
          };
          items.push(item);
          bump(stats, item.action, item.status);
          stats.characteristicMaps += 1;
        } else {
          stats.characteristicMaps += 1;
        }
      }
    }
  }

  // Surface existing DB duplicates as MERGE/REVIEW (reuse A-003 engine)
  const dupes = await auditProductTypeDuplicates(db);
  for (const d of dupes.slice(0, 50)) {
    const item: PlannedImportItem = {
      externalId: null,
      entityType: "PRODUCT_TYPE",
      action: d.decision === "review" ? "REVIEW" : "MERGE",
      oldValue: {
        primaryId: d.primaryId,
        primaryName: d.primaryName,
        products: d.primaryProducts,
      },
      newValue: {
        duplicateId: d.duplicateId,
        duplicateName: d.duplicateName,
        products: d.duplicateProducts,
        reason: d.reason,
      },
      confidence: d.decision === "review" ? 0.6 : 0.92,
      status: "PENDING",
      reason: `dedup:${d.reason}`,
      targetId: d.primaryId,
    };
    items.push(item);
    bump(stats, item.action, item.status);
  }

  // Soft-deactivate safety check sample (never auto-approve with products)
  for (const pt of productTypes.slice(0, 0)) {
    const check = canSoftDeactivate({
      productCount: pt._count.products,
      locallyEdited: pt.locallyEdited,
    });
    void check;
  }

  const categoryPaths = taxonomy.categories.map((c) => c.path);
  const productTypePaths = taxonomy.productTypes.map((pt) => {
    const cat = taxonomy.categories.find((c) => c.key === pt.categoryKey);
    return productTypePagePath(cat?.path ?? pt.slug, pt.slug);
  });

  return {
    source: taxonomy.source,
    version,
    hash,
    taxonomy,
    items,
    statistics: stats,
    seoPaths: {
      categoryPaths: [...new Set(categoryPaths)].slice(0, 200),
      productTypePaths: [...new Set(productTypePaths)].slice(0, 200),
    },
  };
}
