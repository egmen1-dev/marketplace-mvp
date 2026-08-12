import { SellerKind } from "@prisma/client";
import { BadgeCheck, Sparkles, Store } from "lucide-react";

import {
  resolveSellerBadges,
  sellerBadgeLabel,
  type SellerBadgeVariant,
} from "@/features/seller/lib/reputation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BADGE_ICONS: Record<SellerBadgeVariant, React.ReactNode> = {
  NEW_SELLER: <Sparkles className="size-3" aria-hidden />,
  VERIFIED_SELLER: <BadgeCheck className="size-3" aria-hidden />,
  STORE: <Store className="size-3" aria-hidden />,
};

const BADGE_VARIANT: Record<
  SellerBadgeVariant,
  "default" | "secondary" | "outline"
> = {
  NEW_SELLER: "outline",
  VERIFIED_SELLER: "default",
  STORE: "secondary",
};

type SellerBadgeProps = {
  variant: SellerBadgeVariant;
  className?: string;
};

export function SellerBadge({ variant, className }: SellerBadgeProps) {
  return (
    <Badge
      variant={BADGE_VARIANT[variant]}
      className={cn("gap-1 text-[11px] font-medium", className)}
    >
      {BADGE_ICONS[variant]}
      {sellerBadgeLabel(variant)}
    </Badge>
  );
}

type SellerBadgesProps = {
  isVerified: boolean;
  kind: SellerKind;
  joinedAt: Date | string;
  /** Completed (DELIVERED) orders — drives NEW_SELLER graduation by sales. */
  completedOrders?: number;
  className?: string;
};

export function SellerBadges({
  isVerified,
  kind,
  joinedAt,
  completedOrders,
  className,
}: SellerBadgesProps) {
  const badges = resolveSellerBadges({
    isVerified,
    kind,
    joinedAt,
    completedOrders,
  });
  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((variant) => (
        <SellerBadge key={variant} variant={variant} />
      ))}
    </div>
  );
}
