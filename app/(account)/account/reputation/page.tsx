import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { SellerReputationPanel } from "@/features/marketplace-trust-loop";
import { ROUTES } from "@/lib/constants";
import { getSellerReputationPage, isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop";

export const metadata = { title: "Моя репутация" };

export default async function AccountReputationPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_REPUTATION);
  const enabled = isMarketplaceTrustLoopEnabled();
  const reputation = enabled
    ? await getSellerReputationPage(seller.sellerProfileId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Моя репутация
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Отзывы покупателей и уровень доверия вашего магазина
        </p>
      </div>
      {!enabled || !reputation ? (
        <p className="text-sm text-muted-foreground">
          MARKETPLACE_TRUST_LOOP_ENABLED=false
        </p>
      ) : (
        <SellerReputationPanel reputation={reputation} />
      )}
    </div>
  );
}
