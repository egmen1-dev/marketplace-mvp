/**
 * Internal boot isolation — disable modules via EXPO_PUBLIC_BOOT_DISABLE=network,update
 * for binary-search crash diagnosis. Not exposed to end users.
 */
const disabled = new Set(
  (process.env.EXPO_PUBLIC_BOOT_DISABLE ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean),
);

export function isBootModuleEnabled(module: "network" | "update" | "diagnostics"): boolean {
  return !disabled.has(module);
}
