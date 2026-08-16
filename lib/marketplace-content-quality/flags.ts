/** MARKETPLACE-CONTENT-QUALITY-INTELLIGENCE-001 — advisory layer; default OFF. */
export function isMarketplaceContentQualityEnabled(): boolean {
  return process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED === "true";
}

export function isMarketplaceContentQualityDaosEnabled(): boolean {
  return (
    isMarketplaceContentQualityEnabled() &&
    process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED === "true"
  );
}
