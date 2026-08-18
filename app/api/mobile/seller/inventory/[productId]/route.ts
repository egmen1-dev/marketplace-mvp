import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import {
  getSellerInventoryProductDetail,
  listInventoryHistory,
  updateMobileSellerInventoryStockFromRequest,
} from "@/lib/mobile/seller-inventory-data";

type Params = { params: Promise<{ productId: string }> };

export async function GET(request: Request, { params }: Params) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { productId } = await params;
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [product, history] = await Promise.all([
    getSellerInventoryProductDetail(user.sellerProfileId, productId),
    listInventoryHistory({ sellerProfileId: user.sellerProfileId, productId, pageSize: 20 }),
  ]);

  if (!product) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(
    withMobileApiContract({ product, history: history.items }, "mobile-seller-inventory-product-v1"),
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { productId } = await params;
  const body = (await request.json()) as { quantity?: number; delta?: number; note?: string | null };
  if (body.quantity === undefined && body.delta === undefined) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateMobileSellerInventoryStockFromRequest(request, productId, body);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "NOT_FOUND" ? 404 : 400 });
  }

  return NextResponse.json(withMobileApiContract(result, "mobile-seller-inventory-product-v1"));
}
