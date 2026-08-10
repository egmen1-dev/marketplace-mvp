/**
 * Idempotent taxonomy upsert into LOT DB.
 * - Never hard-deletes categories/types with products
 * - Soft-deactivates missing external rows (isActive=false)
 * - Respects locallyEdited (does not overwrite name/slug)
 */

import { Prisma, type PrismaClient } from "@prisma/client";

import { normalizeAlias } from "./normalize";
import type { NormalizedTaxonomy } from "./types";

export type SyncStats = {
  categoriesUpserted: number;
  productTypesUpserted: number;
  characteristicsUpserted: number;
  aliasesUpserted: number;
  categoriesDeactivated: number;
  productTypesDeactivated: number;
  source: string;
};

function cuidLike(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function syncTaxonomyToDb(
  db: PrismaClient,
  taxonomy: NormalizedTaxonomy,
  options?: { deactivateMissing?: boolean },
): Promise<SyncStats> {
  const deactivateMissing = options?.deactivateMissing ?? true;
  const now = new Date();
  const source = taxonomy.source;
  const keyToCategoryId = new Map<string, string>();

  let categoriesUpserted = 0;
  let productTypesUpserted = 0;
  let characteristicsUpserted = 0;
  let aliasesUpserted = 0;

  // Sort categories by level so parents exist first
  const cats = [...taxonomy.categories].sort((a, b) => a.level - b.level);

  for (const cat of cats) {
    const parentId = cat.parentKey
      ? keyToCategoryId.get(cat.parentKey) ?? null
      : null;

    const existing = await db.category.findFirst({
      where: {
        OR: [
          { externalSource: cat.externalSource, externalId: cat.externalId },
          { slug: cat.slug },
        ],
      },
    });

    if (existing) {
      keyToCategoryId.set(cat.key, existing.id);
      await db.category.update({
        where: { id: existing.id },
        data: {
          ...(existing.locallyEdited
            ? {}
            : {
                name: cat.name,
                slug: existing.slug, // keep stable slug for URLs
              }),
          parentId: parentId ?? existing.parentId,
          level: cat.level,
          path: cat.path,
          isActive: true,
          externalSource: cat.externalSource,
          externalId: cat.externalId,
          externalName: cat.externalName,
          sourceUpdatedAt: now,
          lastSyncedAt: now,
          sortOrder: cat.sortOrder,
        },
      });
    } else {
      const id = cuidLike();
      keyToCategoryId.set(cat.key, id);
      // Ensure unique slug
      let slug = cat.slug;
      const slugTaken = await db.category.findUnique({ where: { slug } });
      if (slugTaken) slug = `${slug}-${cat.externalId}`.slice(0, 80);

      await db.category.create({
        data: {
          id,
          name: cat.name,
          slug,
          parentId,
          level: cat.level,
          path: cat.path,
          sortOrder: cat.sortOrder,
          isActive: true,
          externalSource: cat.externalSource,
          externalId: cat.externalId,
          externalName: cat.externalName,
          sourceUpdatedAt: now,
          lastSyncedAt: now,
        },
      });
    }
    categoriesUpserted += 1;
  }

  const seenTypeExternalIds = new Set<string>();

  for (const pt of taxonomy.productTypes) {
    const categoryId = keyToCategoryId.get(pt.categoryKey);
    if (!categoryId) continue;

    seenTypeExternalIds.add(`${pt.externalSource}:${pt.externalId}`);

    let existing = await db.productType.findFirst({
      where: {
        OR: [
          { externalSource: pt.externalSource, externalId: pt.externalId },
          { slug: pt.slug },
        ],
      },
    });

    if (existing) {
      await db.productType.update({
        where: { id: existing.id },
        data: {
          ...(existing.locallyEdited
            ? {}
            : {
                name: pt.name,
                lotName: existing.lotName ?? pt.name,
              }),
          categoryId,
          isActive: true,
          externalSource: pt.externalSource,
          externalId: pt.externalId,
          externalName: pt.externalName,
          sourceUpdatedAt: now,
          lastSyncedAt: now,
          sortOrder: pt.sortOrder,
        },
      });
    } else {
      let slug = pt.slug;
      const slugTaken = await db.productType.findUnique({ where: { slug } });
      if (slugTaken) slug = `${slug}-${pt.externalId}`.slice(0, 80);
      existing = await db.productType.create({
        data: {
          id: cuidLike(),
          categoryId,
          name: pt.name,
          lotName: pt.name,
          slug,
          sortOrder: pt.sortOrder,
          isActive: true,
          externalSource: pt.externalSource,
          externalId: pt.externalId,
          externalName: pt.externalName,
          sourceUpdatedAt: now,
          lastSyncedAt: now,
        },
      });
    }
    productTypesUpserted += 1;

    for (const alias of pt.aliases ?? []) {
      const normalized = normalizeAlias(alias);
      if (!normalized) continue;
      await db.productTypeAlias.upsert({
        where: {
          productTypeId_normalized: {
            productTypeId: existing.id,
            normalized,
          },
        },
        create: {
          id: cuidLike(),
          productTypeId: existing.id,
          alias,
          normalized,
        },
        update: { alias },
      });
      aliasesUpserted += 1;
    }

    for (const ch of pt.characteristics) {
      const existingCh = await db.productCharacteristicDefinition.findFirst({
        where: {
          OR: [
            {
              externalSource: ch.externalSource,
              externalId: ch.externalId,
            },
            { productTypeId: existing.id, slug: ch.slug },
          ],
        },
      });

      const optionsJson =
        ch.options && ch.options.length
          ? (ch.options as Prisma.InputJsonValue)
          : Prisma.JsonNull;

      if (existingCh) {
        await db.productCharacteristicDefinition.update({
          where: { id: existingCh.id },
          data: {
            name: ch.name,
            type: ch.type,
            required: ch.required,
            unit: ch.unit ?? null,
            options: optionsJson,
            sortOrder: ch.sortOrder,
            filterable: ch.filterable,
            externalId: ch.externalId,
            externalSource: ch.externalSource,
            productTypeId: existing.id,
          },
        });
      } else {
        await db.productCharacteristicDefinition.create({
          data: {
            id: cuidLike(),
            productTypeId: existing.id,
            name: ch.name,
            slug: ch.slug,
            type: ch.type,
            required: ch.required,
            unit: ch.unit ?? null,
            options: optionsJson,
            sortOrder: ch.sortOrder,
            filterable: ch.filterable,
            externalId: ch.externalId,
            externalSource: ch.externalSource,
          },
        });
      }
      characteristicsUpserted += 1;
    }
  }

  const categoriesDeactivated = 0;
  let productTypesDeactivated = 0;

  if (deactivateMissing && source) {
    // Soft-deactivate product types from this source that disappeared
    const staleTypes = await db.productType.findMany({
      where: {
        externalSource: source === "snapshot" ? { in: ["snapshot", "wildberries"] } : source,
        isActive: true,
        NOT: {
          OR: [...seenTypeExternalIds].map((pair) => {
            const [extSource, ...rest] = pair.split(":");
            return { externalSource: extSource, externalId: rest.join(":") };
          }),
        },
      },
      include: { _count: { select: { products: true } } },
    });

    for (const st of staleTypes) {
      // Never delete; always soft-deactivate
      await db.productType.update({
        where: { id: st.id },
        data: { isActive: false, lastSyncedAt: now },
      });
      productTypesDeactivated += 1;
    }
  }

  return {
    categoriesUpserted,
    productTypesUpserted,
    characteristicsUpserted,
    aliasesUpserted,
    categoriesDeactivated,
    productTypesDeactivated,
    source,
  };
}
