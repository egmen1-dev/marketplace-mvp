import { NextResponse } from "next/server";

import { getProductTypeWithCharacteristics } from "@/features/taxonomy/queries";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

type RouteContext = { params: Promise<{ productTypeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { productTypeId } = await context.params;
  const detail = await getProductTypeWithCharacteristics(productTypeId);
  if (!detail) {
    return NextResponse.json({ error: "Тип товара не найден" }, { status: 404 });
  }

  return NextResponse.json(
    withMobileApiContract(
      {
        productTypeId: detail.id,
        categoryId: detail.categoryId,
        name: detail.name,
        characteristics: detail.characteristics,
      },
      `seller-product-type-chars-${detail.id}`,
    ),
  );
}
