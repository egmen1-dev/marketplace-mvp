import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { getWalletOverview, isLotWalletEnabled } from "@/lib/lot-wallet";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required", retryable: false } }, { status: 401 });
  }

  if (!isLotWalletEnabled()) {
    return NextResponse.json(
      withMobileApiContract(
        { spendable: 0, withdrawable: 0, pending: 0, enabled: false, advisoryOnly: true as const },
        "wallet-disabled",
      ),
    );
  }

  const overview = await getWalletOverview({ userId: user.id, sellerProfileId: user.sellerProfileId });
  return NextResponse.json(
    withMobileApiContract(
      {
        spendable: overview.buckets.spendableAmount,
        withdrawable: overview.buckets.withdrawableAmount,
        pending: overview.buckets.pendingFromSales,
        enabled: true,
        advisoryOnly: true as const,
      },
      `wallet-${user.id}`,
    ),
  );
}
