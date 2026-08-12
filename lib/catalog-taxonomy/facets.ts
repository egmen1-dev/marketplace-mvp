/**
 * Facet engine — definitions + value buckets with product counts.
 */

import { Prisma, ProductStatus, type PrismaClient } from "@prisma/client";

export type FacetDefinition = {
  id: string;
  slug: string;
  name: string;
  type: string;
  unit: string | null;
  options: string[] | null;
  productTypeId: string;
  productTypeName: string;
};

export type FacetValueBucket = {
  value: string;
  label: string;
  count: number;
  /** For NUMBER ranges */
  min?: number;
  max?: number;
};

export type FacetWithValues = FacetDefinition & {
  values: FacetValueBucket[];
};

export type FacetSelection = {
  /** Characteristic definition slug */
  slug: string;
  /** Exact value, or "min-max" range for numbers, or "true"/"false" */
  value: string;
};

function mapFacet(row: {
  id: string;
  slug: string;
  name: string;
  type: string;
  unit: string | null;
  options: unknown;
  productTypeId: string;
  productType: { name: string; lotName: string | null };
}): FacetDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    unit: row.unit,
    options: Array.isArray(row.options) ? row.options.map(String) : null,
    productTypeId: row.productTypeId,
    productTypeName: row.productType.lotName ?? row.productType.name,
  };
}

export async function getFacetDefinitionsForProductType(
  db: PrismaClient,
  productTypeId: string,
): Promise<FacetDefinition[]> {
  const rows = await db.productCharacteristicDefinition.findMany({
    where: { productTypeId, filterable: true },
    orderBy: { sortOrder: "asc" },
    include: {
      productType: { select: { name: true, lotName: true } },
    },
  });
  return rows.map(mapFacet);
}

export async function getFacetDefinitionsForCategory(
  db: PrismaClient,
  categoryId: string,
): Promise<FacetDefinition[]> {
  const categoryIds = await collectDescendantCategoryIds(db, categoryId);
  const types = await db.productType.findMany({
    where: { categoryId: { in: categoryIds }, isActive: true },
    select: { id: true },
  });
  if (!types.length) return [];

  const rows = await db.productCharacteristicDefinition.findMany({
    where: {
      productTypeId: { in: types.map((t) => t.id) },
      filterable: true,
    },
    orderBy: [{ productTypeId: "asc" }, { sortOrder: "asc" }],
    include: {
      productType: { select: { name: true, lotName: true } },
    },
  });

  // Dedupe by slug across types (same facet name wins first)
  const bySlug = new Map<string, FacetDefinition>();
  for (const row of rows) {
    const mapped = mapFacet(row);
    if (!bySlug.has(mapped.slug)) bySlug.set(mapped.slug, mapped);
  }
  return [...bySlug.values()];
}

export async function collectDescendantCategoryIds(
  db: PrismaClient,
  rootId: string,
): Promise<string[]> {
  const all = await db.category.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string | null, string[]>();
  for (const c of all) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c.id);
    byParent.set(c.parentId, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const child of byParent.get(id) ?? []) stack.push(child);
  }
  return out;
}

/** Build Prisma filter for selected facets (AND). */
export function facetSelectionsToWhere(
  selections: FacetSelection[],
  definitions: FacetDefinition[],
): Prisma.ProductWhereInput[] {
  const bySlug = new Map(definitions.map((d) => [d.slug, d]));
  const clauses: Prisma.ProductWhereInput[] = [];

  for (const sel of selections) {
    const def = bySlug.get(sel.slug);
    if (!def || !sel.value.trim()) continue;

    if (def.type === "NUMBER") {
      const range = parseNumberRange(sel.value);
      if (!range) continue;
      const numberFilter: Prisma.DecimalFilter = {};
      if (range.min != null) numberFilter.gte = new Prisma.Decimal(range.min);
      if (range.max != null) numberFilter.lte = new Prisma.Decimal(range.max);
      clauses.push({
        characteristicValues: {
          some: {
            definition: { slug: def.slug },
            valueNumber: numberFilter,
          },
        },
      });
      continue;
    }

    if (def.type === "BOOLEAN") {
      const bool = sel.value === "true" || sel.value === "1";
      clauses.push({
        characteristicValues: {
          some: {
            definition: { slug: def.slug },
            valueBoolean: bool,
          },
        },
      });
      continue;
    }

    clauses.push({
      characteristicValues: {
        some: {
          definition: { slug: def.slug },
          valueText: { equals: sel.value, mode: "insensitive" },
        },
      },
    });
  }

  return clauses;
}

export function parseNumberRange(
  raw: string,
): { min?: number; max?: number } | null {
  const t = raw.trim();
  if (!t) return null;
  const range = t.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }
  const n = Number(t);
  if (Number.isFinite(n)) return { min: n, max: n };
  return null;
}

function numberBuckets(
  values: number[],
  unit: string | null,
): FacetValueBucket[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [
      {
        value: String(min),
        label: unit ? `${min} ${unit}` : String(min),
        count: values.length,
        min,
        max,
      },
    ];
  }
  const steps = 4;
  const width = (max - min) / steps;
  const buckets: FacetValueBucket[] = [];
  for (let i = 0; i < steps; i++) {
    const lo = min + width * i;
    const hi = i === steps - 1 ? max : min + width * (i + 1);
    const count = values.filter((v) =>
      i === steps - 1 ? v >= lo && v <= hi : v >= lo && v < hi,
    ).length;
    if (!count) continue;
    const loR = Math.round(lo * 100) / 100;
    const hiR = Math.round(hi * 100) / 100;
    buckets.push({
      value: `${loR}-${hiR}`,
      label: unit ? `${loR}–${hiR} ${unit}` : `${loR}–${hiR}`,
      count,
      min: loR,
      max: hiR,
    });
  }
  return buckets;
}

/**
 * Facets with value buckets + counts for ACTIVE products in scope.
 * `selected` narrows the product universe for counts (except the facet itself).
 */
export async function getFacetsWithValues(
  db: PrismaClient,
  options: {
    categoryId?: string;
    productTypeId?: string;
    productTypeSlug?: string;
    selected?: FacetSelection[];
  },
): Promise<FacetWithValues[]> {
  let definitions: FacetDefinition[] = [];
  const productWhere: Prisma.ProductWhereInput = {
    status: ProductStatus.ACTIVE,
  };

  if (options.productTypeId) {
    definitions = await getFacetDefinitionsForProductType(
      db,
      options.productTypeId,
    );
    productWhere.productTypeId = options.productTypeId;
  } else if (options.productTypeSlug) {
    const pt = await db.productType.findFirst({
      where: { slug: options.productTypeSlug, isActive: true },
    });
    if (!pt) return [];
    definitions = await getFacetDefinitionsForProductType(db, pt.id);
    productWhere.productTypeId = pt.id;
  } else if (options.categoryId) {
    definitions = await getFacetDefinitionsForCategory(db, options.categoryId);
    const ids = await collectDescendantCategoryIds(db, options.categoryId);
    productWhere.categoryId = { in: ids };
  } else {
    return [];
  }

  if (!definitions.length) return [];

  const selected = options.selected ?? [];
  const result: FacetWithValues[] = [];

  for (const def of definitions) {
    const otherSelections = selected.filter((s) => s.slug !== def.slug);
    const andClauses = facetSelectionsToWhere(otherSelections, definitions);
    const scopeWhere: Prisma.ProductWhereInput = {
      ...productWhere,
      ...(andClauses.length ? { AND: andClauses } : {}),
      characteristicValues: {
        some: { definition: { slug: def.slug } },
      },
    };

    const products = await db.product.findMany({
      where: scopeWhere,
      select: {
        id: true,
        characteristicValues: {
          where: { definition: { slug: def.slug } },
          select: {
            valueText: true,
            valueNumber: true,
            valueBoolean: true,
            valueJson: true,
          },
        },
      },
      take: 5000,
    });

    let values: FacetValueBucket[] = [];

    if (def.type === "NUMBER") {
      const nums: number[] = [];
      for (const p of products) {
        for (const v of p.characteristicValues) {
          if (v.valueNumber != null) nums.push(Number(v.valueNumber));
        }
      }
      values = numberBuckets(nums, def.unit);
    } else if (def.type === "BOOLEAN") {
      let yes = 0;
      let no = 0;
      for (const p of products) {
        for (const v of p.characteristicValues) {
          if (v.valueBoolean === true) yes += 1;
          if (v.valueBoolean === false) no += 1;
        }
      }
      if (yes) values.push({ value: "true", label: "Да", count: yes });
      if (no) values.push({ value: "false", label: "Нет", count: no });
    } else {
      const counts = new Map<string, number>();
      for (const p of products) {
        for (const v of p.characteristicValues) {
          const texts: string[] = [];
          if (v.valueText) texts.push(v.valueText);
          if (Array.isArray(v.valueJson)) {
            texts.push(...v.valueJson.map(String));
          }
          for (const t of texts) {
            const key = t.trim();
            if (!key) continue;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
      }
      // Prefer declared options order
      if (def.options?.length) {
        for (const opt of def.options) {
          const c = counts.get(opt) ?? 0;
          if (c > 0) values.push({ value: opt, label: opt, count: c });
          counts.delete(opt);
        }
      }
      for (const [value, count] of [...counts.entries()].sort(
        (a, b) => b[1] - a[1],
      )) {
        values.push({ value, label: value, count });
      }
    }

    result.push({ ...def, values });
  }

  return result;
}

/** Parse `f_power-w=500-1000` style query params. */
export function parseFacetQueryParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): FacetSelection[] {
  const selections: FacetSelection[] = [];

  const entries: Array<[string, string]> = [];
  if (params instanceof URLSearchParams) {
    for (const [k, v] of params.entries()) entries.push([k, v]);
  } else {
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach((x) => entries.push([k, x]));
      else entries.push([k, v]);
    }
  }

  for (const [key, value] of entries) {
    if (!key.startsWith("f_") || !value.trim()) continue;
    selections.push({ slug: key.slice(2), value: value.trim() });
  }
  return selections;
}
