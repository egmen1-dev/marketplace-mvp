import { NextResponse } from "next/server";

import {
  getProductTypeWithCharacteristics,
  listCategoryChildren,
  listProductTypesForCategory,
} from "@/features/taxonomy/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productTypeId = searchParams.get("productTypeId");
  if (productTypeId) {
    const detail = await getProductTypeWithCharacteristics(productTypeId);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  }

  const categoryId = searchParams.get("categoryId");
  if (categoryId === "root" || categoryId === "") {
    const children = await listCategoryChildren(null);
    return NextResponse.json({ children, productTypes: [] });
  }

  if (categoryId) {
    const [children, productTypes] = await Promise.all([
      listCategoryChildren(categoryId),
      listProductTypesForCategory(categoryId),
    ]);
    return NextResponse.json({ children, productTypes });
  }

  return NextResponse.json({ error: "Missing params" }, { status: 400 });
}
