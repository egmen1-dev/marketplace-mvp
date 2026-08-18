import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import {
  buildMobileSellerTaxonomyBrowseFromRequest,
  wrapMobileEditorContract,
} from "@/lib/mobile/seller-product-editor-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const payload = await buildMobileSellerTaxonomyBrowseFromRequest(request, {
    categoryId: searchParams.get("categoryId"),
    productTypeId: searchParams.get("productTypeId"),
  });

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = [
    "seller-taxonomy",
    searchParams.get("categoryId") ?? "root",
    searchParams.get("productTypeId") ?? "",
  ].join("-");

  return NextResponse.json(wrapMobileEditorContract(payload, cacheKey));
}
