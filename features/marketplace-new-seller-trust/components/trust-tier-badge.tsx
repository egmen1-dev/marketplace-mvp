import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrustTier } from "@/lib/marketplace-new-seller-trust/types";

type TrustTierBadgeProps = {
  tier: TrustTier;
  className?: string;
};

export function TrustTierBadge({ tier, className }: TrustTierBadgeProps) {
  return (
    <Badge
      variant={tier.id === "new_seller" ? "outline" : "secondary"}
      className={cn("gap-1 text-[11px] font-medium", className)}
      data-testid={`trust-tier-${tier.id}`}
    >
      {tier.label}
      <span className="text-muted-foreground">· {tier.subtitle}</span>
    </Badge>
  );
}
