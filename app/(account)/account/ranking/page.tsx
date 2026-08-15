import { SellerRankingPanel } from "@/features/marketplace-ranking-intelligence";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import {
  getSellerRankingDashboard,
  isMarketplaceRankingIntelligenceEnabled,
} from "@/lib/marketplace-ranking-intelligence";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Позиция в каталоге",
};

export default async function AccountRankingPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_RANKING);
  const enabled = isMarketplaceRankingIntelligenceEnabled();
  const dashboard = enabled
    ? await getSellerRankingDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        algorithmVersion: "v1",
        averageScore: 0,
        eligibleCount: 0,
        notEligibleCount: 0,
        products: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Позиция в каталоге
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Понятная оценка позиции, блокеры и прогноз улучшений — без изменения live search.
        </p>
      </div>
      <SellerRankingPanel dashboard={dashboard} sellerProfileId={seller.sellerProfileId} />
    </div>
  );
}
