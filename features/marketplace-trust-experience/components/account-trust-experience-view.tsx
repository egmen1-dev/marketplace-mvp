import { AccountReputationView } from "@/features/marketplace-trust-score/components/account-reputation-view";
import { NewSellerTrustCenterSections } from "@/features/marketplace-new-seller-trust";
import type { SellerReputationSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";
import type { NewSellerTrustSnapshot } from "@/lib/marketplace-new-seller-trust/types";
import type { SellerTrustScoreSnapshot } from "@/lib/marketplace-trust-score/types";
import type { SellerTrustCenterSnapshot } from "@/lib/marketplace-trust-experience/types";

import { SellerTrustCenterPanel } from "./seller-trust-center-panel";

type AccountTrustExperienceViewProps = {
  sellerId: string;
  center: SellerTrustCenterSnapshot | null;
  legacy: SellerReputationSnapshot | null;
  trustScore: SellerTrustScoreSnapshot | null;
  newSeller: NewSellerTrustSnapshot | null;
};

export function AccountTrustExperienceView({
  sellerId,
  center,
  legacy,
  trustScore,
  newSeller,
}: AccountTrustExperienceViewProps) {
  if (center) {
    return (
      <div className="flex flex-col gap-6">
        {newSeller?.isNewSeller ? (
          <NewSellerTrustCenterSections snapshot={newSeller} sellerId={sellerId} />
        ) : null}
        <SellerTrustCenterPanel center={center} sellerId={sellerId} />
      </div>
    );
  }

  if (newSeller?.isNewSeller) {
    return <NewSellerTrustCenterSections snapshot={newSeller} sellerId={sellerId} />;
  }

  return <AccountReputationView legacy={legacy} trustScore={trustScore} />;
}
