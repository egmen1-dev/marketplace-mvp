/** Wave 6 Evolution Platform — default OFF until explicitly enabled. */
export function isCcosEvolutionPlatformEnabled(): boolean {
  return process.env.CCOS_EVOLUTION_PLATFORM_ENABLED === "true";
}
