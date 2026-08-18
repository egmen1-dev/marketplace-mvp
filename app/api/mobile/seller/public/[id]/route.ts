import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerPublicProfile } from "@/lib/mobile/seller-public-data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  const profile = await buildMobileSellerPublicProfile(id);
  if (!profile) {
    return NextResponse.json(
      { error: { code: "SELLER_NOT_FOUND", message: "Продавец не найден", retryable: false } },
      { status: 404 },
    );
  }

  return NextResponse.json(withMobileApiContract(profile, `seller-public-${profile.id}`));
}
