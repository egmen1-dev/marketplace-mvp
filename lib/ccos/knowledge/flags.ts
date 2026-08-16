/** CCOS Wave 2 — knowledge & experiment platform flags */
export function isCcosKnowledgePlatformEnabled(): boolean {
  return (
    process.env.CCOS_ENABLED === "true" &&
    (process.env.CCOS_KNOWLEDGE_PLATFORM_ENABLED === "true" ||
      process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true")
  );
}
