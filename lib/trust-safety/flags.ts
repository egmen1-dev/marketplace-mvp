/** Default OFF — advisory trust layer (no ranking / payment changes). */
export function isTrustSafetyEnabled(): boolean {
  return process.env.TRUST_SAFETY_ENABLED === "true";
}
