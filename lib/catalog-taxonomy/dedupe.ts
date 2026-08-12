/**
 * ProductType deduplication — soft-merge duplicates without hard delete.
 *
 * Primary keeps identity; duplicates deactivate after products/aliases/chars remapped.
 */

import type { PrismaClient } from "@prisma/client";

import { invalidateTaxonomyCache } from "./cache";
import { normalizeAlias } from "./normalize";

export type DedupCandidate = {
  groupKey: string;
  primaryId: string;
  primaryName: string;
  primarySlug: string;
  primarySource: string | null;
  primaryProducts: number;
  duplicateId: string;
  duplicateName: string;
  duplicateSlug: string;
  duplicateSource: string | null;
  duplicateProducts: number;
  reason: "same_normalized_name" | "same_base_slug" | "shared_alias";
  decision: "merge_into_primary" | "review";
};

export type DedupReport = {
  groups: number;
  candidates: DedupCandidate[];
  applied: number;
  dryRun: boolean;
};

export type DedupApplyResult = {
  primaryId: string;
  duplicateId: string;
  productsRemapped: number;
  aliasesMerged: number;
  characteristicsRemapped: number;
  deactivated: boolean;
};

/** Stable identity key for matching (not DB PK). */
export function productTypeIdentityKey(input: {
  name: string;
  slug: string;
  categoryPath?: string | null;
}): string {
  const name = normalizeAlias(input.name);
  const slug = input.slug.replace(/-lot-[^-]+$/i, "").toLowerCase();
  const path = (input.categoryPath ?? "").toLowerCase();
  return `${slug}::${name}::${path}`;
}

export function baseProductTypeSlug(slug: string): string {
  return slug.replace(/-lot-[^-]+$/i, "").toLowerCase();
}

function pickPrimary<
  T extends {
    id: string;
    externalSource: string | null;
    locallyEdited: boolean;
    createdAt: Date;
    _count: { products: number; aliases: number };
  },
>(a: T, b: T): T {
  if (a._count.products !== b._count.products) {
    return a._count.products >= b._count.products ? a : b;
  }
  if (a.locallyEdited !== b.locallyEdited) {
    return a.locallyEdited ? a : b;
  }
  // Prefer snapshot over wildberries for curated LOT types
  const rank = (s: string | null) =>
    s === "snapshot" ? 3 : s === "manual" ? 2 : s === "wildberries" ? 1 : 0;
  if (rank(a.externalSource) !== rank(b.externalSource)) {
    return rank(a.externalSource) >= rank(b.externalSource) ? a : b;
  }
  if (a._count.aliases !== b._count.aliases) {
    return a._count.aliases >= b._count.aliases ? a : b;
  }
  return a.createdAt <= b.createdAt ? a : b;
}

/** Audit duplicate ProductTypes (dry-run by default). */
export async function auditProductTypeDuplicates(
  db: PrismaClient,
): Promise<DedupCandidate[]> {
  const types = await db.productType.findMany({
    where: { isActive: true },
    include: {
      aliases: true,
      category: { select: { path: true, name: true } },
      _count: { select: { products: true, aliases: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const candidates: DedupCandidate[] = [];
  const seenPairs = new Set<string>();

  function pushPair(
    a: (typeof types)[number],
    b: (typeof types)[number],
    reason: DedupCandidate["reason"],
  ) {
    const primary = pickPrimary(a, b);
    const duplicate = primary.id === a.id ? b : a;
    const key = [primary.id, duplicate.id].sort().join(":");
    if (seenPairs.has(key)) return;
    seenPairs.add(key);

    candidates.push({
      groupKey: productTypeIdentityKey({
        name: primary.lotName ?? primary.name,
        slug: primary.slug,
        categoryPath: primary.category.path,
      }),
      primaryId: primary.id,
      primaryName: primary.lotName ?? primary.name,
      primarySlug: primary.slug,
      primarySource: primary.externalSource,
      primaryProducts: primary._count.products,
      duplicateId: duplicate.id,
      duplicateName: duplicate.lotName ?? duplicate.name,
      duplicateSlug: duplicate.slug,
      duplicateSource: duplicate.externalSource,
      duplicateProducts: duplicate._count.products,
      reason,
      decision:
        primary._count.products + duplicate._count.products > 0 ||
        normalizeAlias(primary.lotName ?? primary.name) ===
          normalizeAlias(duplicate.lotName ?? duplicate.name)
          ? "merge_into_primary"
          : "review",
    });
  }

  // Group by normalized display name
  const byName = new Map<string, typeof types>();
  for (const t of types) {
    const key = normalizeAlias(t.lotName ?? t.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(t);
    byName.set(key, list);
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pushPair(group[i], group[j], "same_normalized_name");
      }
    }
  }

  // Group by base slug
  const bySlug = new Map<string, typeof types>();
  for (const t of types) {
    const key = baseProductTypeSlug(t.slug);
    const list = bySlug.get(key) ?? [];
    list.push(t);
    bySlug.set(key, list);
  }
  for (const group of bySlug.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pushPair(group[i], group[j], "same_base_slug");
      }
    }
  }

  // Shared aliases
  const aliasOwners = new Map<string, typeof types>();
  for (const t of types) {
    for (const a of t.aliases) {
      const n = a.normalized || normalizeAlias(a.alias);
      if (!n) continue;
      const list = aliasOwners.get(n) ?? [];
      if (!list.some((x) => x.id === t.id)) list.push(t);
      aliasOwners.set(n, list);
    }
  }
  for (const group of aliasOwners.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pushPair(group[i], group[j], "shared_alias");
      }
    }
  }

  return candidates;
}

/** Merge duplicate into primary (products, aliases, characteristic values). */
export async function mergeProductTypeDuplicate(
  db: PrismaClient,
  primaryId: string,
  duplicateId: string,
): Promise<DedupApplyResult> {
  if (primaryId === duplicateId) {
    throw new Error("primary and duplicate must differ");
  }

  const [primary, duplicate] = await Promise.all([
    db.productType.findUniqueOrThrow({
      where: { id: primaryId },
      include: { characteristics: true, aliases: true },
    }),
    db.productType.findUniqueOrThrow({
      where: { id: duplicateId },
      include: { characteristics: true, aliases: true },
    }),
  ]);

  let aliasesMerged = 0;
  for (const alias of duplicate.aliases) {
    const normalized = alias.normalized || normalizeAlias(alias.alias);
    if (!normalized) continue;
    const existing = primary.aliases.find((a) => a.normalized === normalized);
    if (existing) continue;
    await db.productTypeAlias.upsert({
      where: {
        productTypeId_normalized: {
          productTypeId: primaryId,
          normalized,
        },
      },
      create: {
        productTypeId: primaryId,
        alias: alias.alias,
        normalized,
      },
      update: { alias: alias.alias },
    });
    aliasesMerged += 1;
  }

  // Map duplicate characteristic defs → primary defs by slug
  const primaryBySlug = new Map(
    primary.characteristics.map((c) => [c.slug, c]),
  );
  let characteristicsRemapped = 0;

  for (const dupeDef of duplicate.characteristics) {
    let target = primaryBySlug.get(dupeDef.slug);
    if (!target) {
      target = await db.productCharacteristicDefinition.create({
        data: {
          productTypeId: primaryId,
          name: dupeDef.name,
          slug: dupeDef.slug,
          type: dupeDef.type,
          required: dupeDef.required,
          unit: dupeDef.unit,
          options: dupeDef.options ?? undefined,
          sortOrder: dupeDef.sortOrder,
          filterable: dupeDef.filterable,
          externalId: dupeDef.externalId,
          externalSource: dupeDef.externalSource,
        },
      });
      primaryBySlug.set(dupeDef.slug, target);
    }

    const values = await db.productCharacteristicValue.findMany({
      where: { definitionId: dupeDef.id },
    });
    for (const v of values) {
      const existing = await db.productCharacteristicValue.findUnique({
        where: {
          productId_definitionId: {
            productId: v.productId,
            definitionId: target.id,
          },
        },
      });
      if (existing) {
        await db.productCharacteristicValue.delete({ where: { id: v.id } });
      } else {
        await db.productCharacteristicValue.update({
          where: { id: v.id },
          data: { definitionId: target.id },
        });
        characteristicsRemapped += 1;
      }
    }
  }

  const remapped = await db.product.updateMany({
    where: { productTypeId: duplicateId },
    data: {
      productTypeId: primaryId,
      categoryId: primary.categoryId,
    },
  });

  await db.productType.update({
    where: { id: duplicateId },
    data: {
      isActive: false,
      name: `${duplicate.name} (merged → ${primary.lotName ?? primary.name})`,
    },
  });

  invalidateTaxonomyCache();

  return {
    primaryId,
    duplicateId,
    productsRemapped: remapped.count,
    aliasesMerged,
    characteristicsRemapped,
    deactivated: true,
  };
}

export async function dedupeProductTypes(
  db: PrismaClient,
  options?: { dryRun?: boolean; applyAll?: boolean },
): Promise<DedupReport> {
  const dryRun = options?.dryRun ?? true;
  const candidates = await auditProductTypeDuplicates(db);
  let applied = 0;

  if (!dryRun && options?.applyAll) {
    for (const c of candidates) {
      if (c.decision !== "merge_into_primary") continue;
      await mergeProductTypeDuplicate(db, c.primaryId, c.duplicateId);
      applied += 1;
    }
  }

  const groups = new Set(candidates.map((c) => c.groupKey)).size;

  return {
    groups,
    candidates,
    applied,
    dryRun,
  };
}
