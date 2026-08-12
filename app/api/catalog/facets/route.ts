import { NextResponse } from "next/server";

import {
  getFacetsWithValues,
  parseFacetQueryParams,
} from "@/lib/catalog-taxonomy/facets";
import { prisma } from "@/lib/prisma";

/**
 * Facet definitions + value buckets with counts.
 * GET /api/catalog/facets?categoryId=…|category=slug|productTypeId=…|productType=slug
 * Optional selected filters: f_<slug>=value
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productTypeId = searchParams.get("productTypeId") ?? undefined;
  const productType = searchParams.get("productType") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && category) {
    const cat = await prisma.category.findFirst({
      where: { slug: category, isActive: true },
      select: { id: true },
    });
    resolvedCategoryId = cat?.id;
  }

  if (!productTypeId && !productType && !resolvedCategoryId) {
    return NextResponse.json(
      { error: "productTypeId, productType, categoryId or category required" },
      { status: 400 },
    );
  }

  const selected = parseFacetQueryParams(searchParams);
  const facets = await getFacetsWithValues(prisma, {
    categoryId: resolvedCategoryId,
    productTypeId,
    productTypeSlug: productType,
    selected,
  });

  return NextResponse.json({ facets, selected });
}
