import { NextResponse } from "next/server";

import {
  getFacetDefinitionsForCategory,
  getFacetDefinitionsForProductType,
} from "@/lib/catalog-taxonomy/facets";
import { prisma } from "@/lib/prisma";

/**
 * Facet definitions readiness API — no catalog UI yet.
 * GET /api/catalog/facets?productTypeId=... | ?categoryId=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productTypeId = searchParams.get("productTypeId");
  const categoryId = searchParams.get("categoryId");

  if (!productTypeId && !categoryId) {
    return NextResponse.json(
      { error: "productTypeId or categoryId required" },
      { status: 400 },
    );
  }

  const facets = productTypeId
    ? await getFacetDefinitionsForProductType(prisma, productTypeId)
    : await getFacetDefinitionsForCategory(prisma, categoryId!);

  return NextResponse.json({ facets });
}
