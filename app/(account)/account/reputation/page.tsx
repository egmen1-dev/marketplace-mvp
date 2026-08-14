import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { AccountReputationView } from "@/features/marketplace-trust-score";
import { ROUTES } from "@/lib/constants";
import {
  getSellerReputationPage,
  isMarketplaceTrustLoopEnabled,
} from "@/lib/marketplace-trust-loop";
import {
  getSellerTrustScorePage,
  isMarketplaceTrustScoreModelEnabled,
} from "@/lib/marketplace-trust-score";

export const metadata = { title: "Моя репутация" };

export default async function AccountReputationPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_REPUTATION);
  const trustLoopEnabled = isMarketplaceTrustLoopEnabled();
  const trustScoreEnabled = isMarketplaceTrustScoreModelEnabled();

  const [legacy, trustScore] = await Promise.all([
    trustLoopEnabled ? getSellerReputationPage(seller.sellerProfileId) : Promise.resolve(null),
    trustScoreEnabled ? getSellerTrustScorePage(seller.sellerProfileId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Моя репутация
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Рейтинг доверия, отзывы покупателей и подсказки по улучшению магазина
        </p>
      </div>
      {!trustLoopEnabled && !trustScoreEnabled ? (
        <p className="text-sm text-muted-foreground">
          MARKETPLACE_TRUST_LOOP_ENABLED=false · MARKETPLACE_TRUST_SCORE_MODEL_ENABLED=false
        </p>
      ) : (
        <AccountReputationView legacy={legacy} trustScore={trustScore} />
      )}
    </div>
  );
}
