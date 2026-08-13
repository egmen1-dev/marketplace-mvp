/**
 * TRUST_SAFETY_ENABLED — default false.
 * Set to "true" on Railway staging to surface trust UI.
 * NEXT_PUBLIC_TRUST_SAFETY_ENABLED mirrors for client components.
 */
export function isTrustSafetyEnabled(): boolean {
  const server = process.env.TRUST_SAFETY_ENABLED?.trim().toLowerCase();
  const pub = process.env.NEXT_PUBLIC_TRUST_SAFETY_ENABLED?.trim().toLowerCase();
  return server === "true" || pub === "true";
}
