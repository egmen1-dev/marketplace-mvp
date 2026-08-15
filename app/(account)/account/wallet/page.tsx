import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LotWalletPanel } from "@/features/lot-wallet/components/lot-wallet-panel";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { getSellerBalanceForSession } from "@/lib/finance";
import {
  getWalletOverview,
  isLotWalletEnabled,
  listWalletHistory,
} from "@/lib/lot-wallet";
import type { WalletHistoryFilter } from "@/lib/lot-wallet";
import { ROUTES } from "@/lib/constants";
import {
  getSellerPayoutDashboard,
  isSellerPayoutEnabled,
} from "@/lib/seller-payout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Кошелёк ЛОТ",
};

type PageProps = {
  searchParams: Promise<{ tab?: string; filter?: string }>;
};

export default async function AccountWalletPage({ searchParams }: PageProps) {
  if (!isLotWalletEnabled()) {
    redirect(ROUTES.ACCOUNT_BALANCE);
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(`${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_WALLET)}`);
  }

  const params = await searchParams;
  const historyFilter = (params.filter as WalletHistoryFilter | undefined) ?? "all";

  const dbUser = await loadUserAuthFromDb(user.id);
  const isSeller = Boolean(
    dbUser?.sellerProfileId &&
      (dbUser.role === "SELLER" || dbUser.role === "ADMIN"),
  );

  const [overview, balance, payoutData, history] = await Promise.all([
    getWalletOverview({
      userId: user.id,
      sellerProfileId: dbUser?.sellerProfileId ?? null,
    }),
    isSeller && dbUser?.sellerProfileId
      ? getSellerBalanceForSession(dbUser.sellerProfileId)
      : Promise.resolve(null),
    isSeller && dbUser?.sellerProfileId && isSellerPayoutEnabled()
      ? getSellerPayoutDashboard(dbUser.sellerProfileId)
      : Promise.resolve({
          enabled: false,
          balance: {
            pendingAmount: 0,
            availableAmount: 0,
            paidAmount: 0,
            reservedForPayoutAmount: 0,
          },
          methods: [],
          requests: [],
          history: [],
        }),
    listWalletHistory({ userId: user.id, filter: historyFilter }),
  ]);

  return (
    <Suspense fallback={null}>
      <LotWalletPanel
        overview={overview}
        balance={balance}
        payoutData={payoutData}
        payoutEnabled={isSellerPayoutEnabled()}
        isSeller={isSeller}
        history={history}
        historyFilter={historyFilter}
      />
    </Suspense>
  );
}
