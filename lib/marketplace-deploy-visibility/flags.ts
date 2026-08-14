/** Admin deploy visibility tools — always available to admins. */
export function isMarketplaceDeployVisibilityEnabled(): boolean {
  return process.env.MARKETPLACE_DEPLOY_VISIBILITY_ENABLED !== "false";
}

export function isMarketplaceDebugModeEnabled(): boolean {
  if (process.env.MARKETPLACE_DEBUG_MODE_ENABLED === "true") return true;
  const env = process.env.APP_ENV?.trim().toLowerCase();
  return env === "staging" || env === "development" || Boolean(process.env.RAILWAY_ENVIRONMENT);
}
