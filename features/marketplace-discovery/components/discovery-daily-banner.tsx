"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { trackDailyFindClick } from "@/lib/marketplace-discovery/analytics";
import type { DiscoveryProductCard } from "@/lib/marketplace-discovery/types";

type DiscoveryDailyBannerProps = {
  item: DiscoveryProductCard;
  personalized: boolean;
};

export function DiscoveryDailyBanner({
  item,
  personalized,
}: DiscoveryDailyBannerProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="discovery-daily-banner"
    >
      <div>
        <p className="font-medium">
          🎁 {personalized ? "Ваша находка дня готова" : "Находка дня готова"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.product.title}
        </p>
      </div>
      <Button
        size="sm"
        nativeButton={false}
        render={
          <Link
            href={`${ROUTES.PRODUCT}/${item.product.id}`}
            onClick={() => trackDailyFindClick(item.product.id)}
          />
        }
      >
        Открыть
      </Button>
    </div>
  );
}
