import { redirect } from "next/navigation";

import { SellerPayoutPanel } from "@/features/seller-payout";
import { SellerFirstEntryBannerSlot } from "@/features/seller-first-entry";
import {
  getSellerPayoutDashboard,
  isSellerPayoutEnabled,
} from "@/lib/seller-payout";
import { ROUTES } from "@/lib/constants";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { isLotWalletEnabled } from "@/lib/lot-wallet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вывод средств",
};

export default async function AccountPayoutsPage() {
  if (isLotWalletEnabled()) {
    redirect(`${ROUTES.ACCOUNT_WALLET}?tab=withdraw`);
  }

  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_PAYOUTS);
  const data = isSellerPayoutEnabled()
    ? await getSellerPayoutDashboard(seller.sellerProfileId)
    : {
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
      };

  return (
    <div className="flex flex-col gap-6">
      <SellerFirstEntryBannerSlot sellerProfileId={seller.sellerProfileId} />
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Вывод средств
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Создайте заявку на вывод — администратор проверит и выполнит выплату
          вручную.
        </p>
      </div>
      <SellerPayoutPanel data={data} />
    </div>
  );
}
