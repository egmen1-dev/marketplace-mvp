"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

export function HomeHeroCtas() {
  return (
    <div className="flex flex-wrap gap-2.5 sm:gap-3">
      <Button
        size="cta"
        className="rounded-xl px-6"
        nativeButton={false}
        render={<Link href={ROUTES.CATALOG} />}
      >
        Смотреть товары
      </Button>
      <Button
        size="cta"
        variant="outline"
        className="rounded-xl border-border/80 bg-transparent px-6 hover:bg-primary/10"
        nativeButton={false}
        render={
          <Link
            href={ROUTES.SELL}
            onClick={() =>
              trackEvent({
                event: ANALYTICS_EVENTS.CTA_SELL_CLICK,
                route: ROUTES.HOME,
                entityId: "hero_sell",
              })
            }
          />
        }
      >
        Продать товар
      </Button>
    </div>
  );
}
