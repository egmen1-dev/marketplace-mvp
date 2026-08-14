export function isMarketplaceDiscoveryEnabled(): boolean {
  return process.env.MARKETPLACE_DISCOVERY_ENABLED === "true";
}

export function isDiscoveryDailyFindsEnabled(): boolean {
  return (
    isMarketplaceDiscoveryEnabled() &&
    process.env.DISCOVERY_DAILY_FINDS_ENABLED === "true"
  );
}

export function isDiscoveryCollectionsEnabled(): boolean {
  return (
    isMarketplaceDiscoveryEnabled() &&
    process.env.DISCOVERY_COLLECTIONS_ENABLED === "true"
  );
}

export function isDiscoveryPriceGameEnabled(): boolean {
  return (
    isMarketplaceDiscoveryEnabled() &&
    process.env.DISCOVERY_PRICE_GAME_ENABLED === "true"
  );
}

export function isDiscoveryAiContextEnabled(): boolean {
  return (
    isMarketplaceDiscoveryEnabled() &&
    process.env.DISCOVERY_AI_CONTEXT_ENABLED === "true"
  );
}
