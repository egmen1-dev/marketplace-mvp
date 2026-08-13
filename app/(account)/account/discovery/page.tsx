import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { SellerDiscoveryTipsPanel } from "@/features/marketplace-discovery";
import {
  getSellerDiscoveryTips,
  isMarketplaceDiscoveryEnabled,
} from "@/lib/marketplace-discovery";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Находки ЛОТ — для продавца" };

export default async function AccountDiscoveryPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_DISCOVERY);
  const enabled = isMarketplaceDiscoveryEnabled();
  const tips = enabled
    ? await getSellerDiscoveryTips(seller.sellerProfileId)
    : { enabled: false, canAppear: false, blockers: [], strengths: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Находки ЛОТ
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Как ваши товары попадают в подборки и что улучшить
        </p>
      </div>
      <SellerDiscoveryTipsPanel tips={tips} />
    </div>
  );
}
