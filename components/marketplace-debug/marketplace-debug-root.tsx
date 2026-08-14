import { Suspense } from "react";

import { MarketplaceDebugBanner } from "@/features/marketplace-deploy-visibility";
import {
  getMarketplaceDebugSnapshot,
  isMarketplaceDebugModeEnabled,
} from "@/lib/marketplace-deploy-visibility";

export async function MarketplaceDebugRoot() {
  if (!isMarketplaceDebugModeEnabled()) return null;

  const snapshot = getMarketplaceDebugSnapshot();

  return (
    <Suspense fallback={null}>
      <MarketplaceDebugBanner snapshot={snapshot} />
    </Suspense>
  );
}
