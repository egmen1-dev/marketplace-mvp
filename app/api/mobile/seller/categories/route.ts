import { NextResponse } from "next/server";

import { ProductServiceError } from "@/features/products/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import {
  buildMobileSellerCategoriesFromRequest,
  wrapMobileEditorContract,
} from "@/lib/mobile/seller-product-editor-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileSellerCategoriesFromRequest(request);
  return NextResponse.json(wrapMobileEditorContract(payload, "seller-editor-categories"));
}
