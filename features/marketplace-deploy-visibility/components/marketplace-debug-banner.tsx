"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { isMarketplaceDebugQuery } from "@/lib/marketplace-deploy-visibility/debug";
import type { MarketplaceDebugSnapshot } from "@/lib/marketplace-deploy-visibility/types";

type MarketplaceDebugBannerProps = {
  snapshot: MarketplaceDebugSnapshot;
};

export function MarketplaceDebugBanner({ snapshot }: MarketplaceDebugBannerProps) {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const query = searchParams.toString();
    setVisible(isMarketplaceDebugQuery(query ? `?${query}` : ""));
  }, [searchParams]);

  if (!visible) return null;

  return (
    <div
      className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
      data-testid="marketplace-debug-banner"
    >
      <p className="font-medium">Marketplace debug · build {snapshot.buildCommit} · {snapshot.environment}</p>
      <p className="mt-1 text-muted-foreground">Enabled modules:</p>
      <ul className="mt-1 flex flex-wrap gap-2">
        {snapshot.activeModules.length > 0 ? (
          snapshot.activeModules.map((name) => (
            <li key={name} className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800">
              ✓ {name}
            </li>
          ))
        ) : (
          <li className="text-xs text-muted-foreground">нет активных flags</li>
        )}
      </ul>
    </div>
  );
}
