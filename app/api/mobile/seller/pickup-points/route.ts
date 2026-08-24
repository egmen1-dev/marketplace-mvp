import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireSellerFromRequest,
  SellerRequiredError,
} from "@/features/auth/resolve-request-user";
import { listSellerPickupPoints } from "@/features/pickup/queries";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  try {
    const seller = await requireSellerFromRequest(request);
    const items = await listSellerPickupPoints(seller.sellerProfileId, { activeOnly: true });
    return NextResponse.json(withMobileApiContract({ items }, `seller-pickup-points-${seller.sellerProfileId}`));
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    if (err instanceof SellerRequiredError) {
      return NextResponse.json({ error: "Нужен профиль продавца" }, { status: 403 });
    }
    console.error("[GET /api/mobile/seller/pickup-points]", err);
    return NextResponse.json({ error: "Не удалось загрузить точки самовывоза" }, { status: 500 });
  }
}
