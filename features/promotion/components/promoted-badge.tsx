import { Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type PromotedBadgeProps = {
  className?: string;
};

/** Subtle PDP badge — not aggressive ad styling. */
export function PromotedBadge({ className }: PromotedBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={className}
      data-testid="promoted-badge"
    >
      <Megaphone className="mr-1 size-3" aria-hidden />
      Продвигаемый продавцом
    </Badge>
  );
}
