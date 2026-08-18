import { NextResponse } from "next/server";

import { ProductServiceError } from "@/features/products/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerProductDetailFromRequest } from "@/lib/mobile/seller-products-data";
import {
  buildMobileSellerProductEditorFromRequest,
  saveMobileSellerProductFromRequest,
  wrapMobileEditorContract,
} from "@/lib/mobile/seller-product-editor-data";
import type { MobileSellerProductEditorInput } from "@/lib/mobile/seller-product-editor-types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const editorMode = searchParams.get("editor") === "1";

  if (editorMode) {
    const editor = await buildMobileSellerProductEditorFromRequest(request, id);
    if (!editor) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(wrapMobileEditorContract(editor, `seller-product-editor-${id}`));
  }

  const detail = await buildMobileSellerProductDetailFromRequest(request, id);
  if (!detail) {
    return NextResponse.json(withMobileApiContract({ error: "NOT_FOUND" }, `seller-product-${id}`), {
      status: 404,
    });
  }

  return NextResponse.json(withMobileApiContract(detail, `seller-product-${id}`));
}

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  let body: MobileSellerProductEditorInput;
  try {
    body = (await request.json()) as MobileSellerProductEditorInput;
  } catch {
    return NextResponse.json({ error: "Ожидается JSON-тело запроса" }, { status: 400 });
  }

  try {
    const saved = await saveMobileSellerProductFromRequest(request, id, body);
    return NextResponse.json(wrapMobileEditorContract(saved, `seller-product-save-${id}`));
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
}
