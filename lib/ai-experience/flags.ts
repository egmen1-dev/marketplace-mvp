/** Default OFF — unified AI presentation layer (no new algorithms). */
export function isAiExperienceEnabled(): boolean {
  return process.env.AI_EXPERIENCE_ENABLED === "true";
}
