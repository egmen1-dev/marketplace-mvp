import type { ContentQualityProvider } from "./providers/content-quality-provider";
import { RuleBasedFallbackProvider } from "./providers/rule-based-fallback";
import { DaosContentQualityProvider } from "./providers/daos";
import { isMarketplaceContentQualityDaosEnabled } from "./flags";

let cachedProvider: ContentQualityProvider | null = null;

export function getContentQualityProvider(): ContentQualityProvider {
  if (cachedProvider) return cachedProvider;

  const fallback = new RuleBasedFallbackProvider();
  if (isMarketplaceContentQualityDaosEnabled()) {
    cachedProvider = new DaosContentQualityProvider(fallback);
  } else {
    cachedProvider = fallback;
  }
  return cachedProvider;
}

/** Test hook — reset provider selection. */
export function resetContentQualityProviderCache(): void {
  cachedProvider = null;
}
