import { AccountReputationView } from "@/features/marketplace-trust-score/components/account-reputation-view";
import { NewSellerTrustCenterSections } from "@/features/marketplace-new-seller-trust";
import { SellerTrustFeedbackPanel } from "@/features/marketplace-trust-conversion";
import type { SellerReputationSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";
import type { NewSellerTrustSnapshot } from "@/lib/marketplace-new-seller-trust/types";
import type { SellerTrustFeedbackSnapshot } from "@/lib/marketplace-trust-conversion/types";
import type { SellerTrustScoreSnapshot } from "@/lib/marketplace-trust-score/types";
import type { SellerTrustCenterSnapshot } from "@/lib/marketplace-trust-experience/types";

import { SellerTrustCenterPanel } from "./seller-trust-center-panel";

type AccountTrustExperienceViewProps = {
  sellerId: string;
  center: SellerTrustCenterSnapshot | null;
  legacy: SellerReputationSnapshot | null;
  trustScore: SellerTrustScoreSnapshot | null;
  newSeller: NewSellerTrustSnapshot | null;
  sellerFeedback: SellerTrustFeedbackSnapshot | null;
};

export function AccountTrustExperienceView({
  sellerId,
  center,
  legacy,
  trustScore,
  newSeller,
  sellerFeedback,
}: AccountTrustExperienceViewProps) {
  if (center) {
    return (
      <div className="flex flex-col gap-6">
        {newSeller?.isNewSeller ? (
          <NewSellerTrustCenterSections snapshot={newSeller} sellerId={sellerId} />
        ) : null}
        <SellerTrustCenterPanel center={center} sellerId={sellerId} />
        {sellerFeedback ? <SellerTrustFeedbackPanel feedback={sellerFeedback} /> : null}
      </div>
    );
  }

  if (newSeller?.isNewSeller) {
    return (
      <div className="flex flex-col gap-6">
        <NewSellerTrustCenterSections snapshot={newSeller} sellerId={sellerId} />
        {sellerFeedback ? <SellerTrustFeedbackPanel feedback={sellerFeedback} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountReputationView legacy={legacy} trustScore={trustScore} />
      {sellerFeedback ? <SellerTrustFeedbackPanel feedback={sellerFeedback} /> : null}
    </div>
  );
}
