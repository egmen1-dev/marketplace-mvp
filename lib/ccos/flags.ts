/** CCOS core — app-agnostic cognitive foundation (EPIC 77 Wave 0). */
export function isCcosEnabled(): boolean {
  return process.env.CCOS_ENABLED === "true";
}
