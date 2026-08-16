import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { listFavoriteProducts, toggleFavorite } from "@/features/favorites/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required", retryable: false } }, { status: 401 });
  }

  const items = await listFavoriteProducts(user.id);
  return NextResponse.json(withMobileApiContract({ items, nextCursor: null, hasMore: false }, `favorites-${user.id}`));
}

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required", retryable: false } }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "productId required", retryable: false } }, { status: 400 });
  }

  const result = await toggleFavorite(user.id, productId);
  return NextResponse.json(withMobileApiContract(result, `${user.id}:${productId}`));
}
