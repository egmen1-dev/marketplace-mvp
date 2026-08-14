export function isMarketplaceSocialGrowthEnabled(): boolean {
  return process.env.MARKETPLACE_SOCIAL_GROWTH_ENABLED === "true";
}

export function isSocialShareCardsEnabled(): boolean {
  return (
    isMarketplaceSocialGrowthEnabled() &&
    process.env.SOCIAL_SHARE_CARDS_ENABLED === "true"
  );
}

export function isSocialCollectionsEnabled(): boolean {
  return (
    isMarketplaceSocialGrowthEnabled() &&
    process.env.SOCIAL_COLLECTIONS_ENABLED === "true"
  );
}

export function isSocialCreatorEnabled(): boolean {
  return (
    isMarketplaceSocialGrowthEnabled() &&
    process.env.SOCIAL_CREATOR_ENABLED === "true"
  );
}
