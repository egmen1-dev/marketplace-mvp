import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { AccountTrustExperienceView } from "@/features/marketplace-trust-experience";
import { ROUTES } from "@/lib/constants";
import {
  getSellerReputationPage,
  isMarketplaceTrustLoopEnabled,
} from "@/lib/marketplace-trust-loop";
import {
  getSellerTrustScorePage,
  isMarketplaceTrustScoreModelEnabled,
} from "@/lib/marketplace-trust-score";
import {
  getSellerTrustCenter,
  isMarketplaceTrustExperienceEnabled,
} from "@/lib/marketplace-trust-experience";
import {
  getNewSellerTrustSnapshot,
  isMarketplaceNewSellerTrustEnabled,
} from "@/lib/marketplace-new-seller-trust";

export const metadata = { title: "Моя репутация" };

export default async function AccountReputationPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_REPUTATION);
  const trustLoopEnabled = isMarketplaceTrustLoopEnabled();
  const trustScoreEnabled = isMarketplaceTrustScoreModelEnabled();
  const experienceEnabled = isMarketplaceTrustExperienceEnabled();

  const newSellerEnabled = isMarketplaceNewSellerTrustEnabled();

  const [legacy, trustScore, center, newSeller] = await Promise.all([
    trustLoopEnabled ? getSellerReputationPage(seller.sellerProfileId) : Promise.resolve(null),
    trustScoreEnabled ? getSellerTrustScorePage(seller.sellerProfileId) : Promise.resolve(null),
    experienceEnabled ? getSellerTrustCenter(seller.sellerProfileId) : Promise.resolve(null),
    newSellerEnabled ? getNewSellerTrustSnapshot(seller.sellerProfileId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {experienceEnabled ? "Центр доверия" : "Моя репутация"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {experienceEnabled
            ? "Рейтинг доверия, факторы, история и следующий шаг для роста магазина"
            : "Отзывы покупателей и уровень доверия вашего магазина"}
        </p>
      </div>
      {!trustLoopEnabled && !trustScoreEnabled && !experienceEnabled ? (
        <p className="text-sm text-muted-foreground">
          MARKETPLACE_TRUST_LOOP_ENABLED=false · MARKETPLACE_TRUST_SCORE_MODEL_ENABLED=false ·
          MARKETPLACE_TRUST_EXPERIENCE_ENABLED=false
        </p>
      ) : (
        <AccountTrustExperienceView
          sellerId={seller.sellerProfileId}
          center={center}
          legacy={legacy}
          trustScore={trustScore}
          newSeller={newSeller}
        />
      )}
    </div>
  );
}
