import { SellerTrustScorePanel } from "@/features/marketplace-trust-score";
import { SellerReputationPanel } from "@/features/marketplace-trust-loop/components/seller-reputation-panel";
import type { SellerReputationSnapshot } from "@/lib/marketplace-trust-loop/reviews/types";
import type { SellerTrustScoreSnapshot } from "@/lib/marketplace-trust-score/types";

type AccountReputationViewProps = {
  legacy: SellerReputationSnapshot | null;
  trustScore: SellerTrustScoreSnapshot | null;
};

export function AccountReputationView({ legacy, trustScore }: AccountReputationViewProps) {
  if (trustScore) {
    return <SellerTrustScorePanel snapshot={trustScore} />;
  }
  if (legacy) {
    return <SellerReputationPanel reputation={legacy} />;
  }
  return null;
}
