import { AccountReputationView } from "@/features/marketplace-trust-score/components/account-reputation-view";
import type { SellerReputationSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";
import type { SellerTrustScoreSnapshot } from "@/lib/marketplace-trust-score/types";
import type { SellerTrustCenterSnapshot } from "@/lib/marketplace-trust-experience/types";

import { SellerTrustCenterPanel } from "./seller-trust-center-panel";

type AccountTrustExperienceViewProps = {
  sellerId: string;
  center: SellerTrustCenterSnapshot | null;
  legacy: SellerReputationSnapshot | null;
  trustScore: SellerTrustScoreSnapshot | null;
};

export function AccountTrustExperienceView({
  sellerId,
  center,
  legacy,
  trustScore,
}: AccountTrustExperienceViewProps) {
  if (center) {
    return <SellerTrustCenterPanel center={center} sellerId={sellerId} />;
  }

  return <AccountReputationView legacy={legacy} trustScore={trustScore} />;
}
