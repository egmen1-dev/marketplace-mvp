import { Badge } from "@/components/ui/badge";
import type { SellerOrderTrustInfo } from "@/lib/trust/types";
import { DISPUTE_REASON_LABELS } from "@/lib/trust/types";

type SellerOrderTrustBadgeProps = {
  trust: SellerOrderTrustInfo;
};

export function SellerOrderTrustBadge({ trust }: SellerOrderTrustBadgeProps) {
  if (!trust.protectionLabel) return null;

  const isDispute =
    trust.disputeStatus === "OPEN" || trust.disputeStatus === "UNDER_REVIEW";

  return (
    <div className="mt-2 space-y-1" data-testid="seller-order-trust">
      <Badge variant={isDispute ? "destructive" : "secondary"}>
        {trust.protectionLabel}
      </Badge>
      {trust.disputeReason ? (
        <p className="text-xs text-muted-foreground">
          {DISPUTE_REASON_LABELS[trust.disputeReason]}
        </p>
      ) : null}
    </div>
  );
}
