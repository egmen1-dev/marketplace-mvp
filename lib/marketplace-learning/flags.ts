/** Default OFF — analytical self-learning layer (no ranking/order changes). */
export function isMarketplaceLearningEnabled(): boolean {
  return process.env.MARKETPLACE_LEARNING_ENABLED === "true";
}
