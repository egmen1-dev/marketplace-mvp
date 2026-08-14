export function isMarketplaceLaunchReadinessEnabled(): boolean {
  return process.env.MARKETPLACE_LAUNCH_READINESS_ENABLED === "true";
}
