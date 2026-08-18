import { NextResponse } from "next/server";

import { ProductServiceError } from "@/features/products/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerProductsFromRequest } from "@/lib/mobile/seller-products-data";
import {
  saveMobileSellerProductFromRequest,
  wrapMobileEditorContract,
} from "@/lib/mobile/seller-product-editor-data";
import type { MobileSellerProductEditorInput } from "@/lib/mobile/seller-product-editor-types";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const page = await buildMobileSellerProductsFromRequest(request, {
    cursor: searchParams.get("cursor"),
    query: searchParams.get("q"),
    filter: searchParams.get("filter"),
    sort: searchParams.get("sort"),
  });

  const cacheKey = [
    "seller-products",
    searchParams.get("cursor") ?? "1",
    searchParams.get("filter") ?? "all",
    searchParams.get("sort") ?? "updated_desc",
    searchParams.get("q") ?? "",
  ].join("-");

  return NextResponse.json(withMobileApiContract(page, cacheKey));
}

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  let body: MobileSellerProductEditorInput;
  try {
    body = (await request.json()) as MobileSellerProductEditorInput;
  } catch {
    return NextResponse.json({ error: "Ожидается JSON-тело запроса" }, { status: 400 });
  }

  try {
    const saved = await saveMobileSellerProductFromRequest(request, null, body);
    return NextResponse.json(wrapMobileEditorContract(saved, `seller-product-create-${saved.id}`), {
      status: 201,
    });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
