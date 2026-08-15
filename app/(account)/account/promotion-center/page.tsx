import { SellerFirstEntryBannerSlot } from "@/features/seller-first-entry";
import { PromotionCenterPanel } from "@/features/seller-promotion-center/components/promotion-center-panel";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { getPromotionCenterDashboard } from "@/lib/seller-promotion-center";
import { getWalletOverview } from "@/lib/lot-wallet";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Продвижение",
};

export default async function AccountPromotionCenterPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_PROMOTION_CENTER);

  const [dashboard, wallet] = await Promise.all([
    getPromotionCenterDashboard(seller.sellerProfileId),
    getWalletOverview({
      userId: seller.userId,
      sellerProfileId: seller.sellerProfileId,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SellerFirstEntryBannerSlot sellerProfileId={seller.sellerProfileId} />
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Продвижение
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Продвижение помогает показать товар большему количеству покупателей.
          Оплата доступна из кошелька ЛОТ.
        </p>
      </div>
      <PromotionCenterPanel dashboard={dashboard} walletBuckets={wallet.buckets} />
    </div>
  );
}
