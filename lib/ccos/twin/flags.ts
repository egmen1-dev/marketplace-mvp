export function isCcosTwinPlatformEnabled(): boolean {
  return (
    process.env.CCOS_ENABLED === "true" &&
    (process.env.CCOS_TWIN_PLATFORM_ENABLED === "true" ||
      process.env.CCOS_PRODUCT_PLATFORM_ENABLED === "true" ||
      process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true")
  );
}
