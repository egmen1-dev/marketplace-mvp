/**
 * Catalog data source labels for admin and sync tooling.
 */

export type CatalogSourceOrigin =
  | "LOCAL"
  | "WB"
  | "SNAPSHOT"
  | "MANUAL"
  | "AI";

const ORIGIN_LABELS: Record<CatalogSourceOrigin, string> = {
  LOCAL: "Локально",
  WB: "Wildberries",
  SNAPSHOT: "Снимок",
  MANUAL: "Ручной seed",
  AI: "AI",
};

/** Map DB externalSource → admin-facing origin. */
export function resolveCatalogSourceOrigin(
  externalSource: string | null | undefined,
): CatalogSourceOrigin {
  if (!externalSource) return "LOCAL";
  switch (externalSource) {
    case "wildberries":
      return "WB";
    case "snapshot":
      return "SNAPSHOT";
    case "manual":
      return "MANUAL";
    case "ai":
      return "AI";
    default:
      return "LOCAL";
  }
}

export function catalogSourceLabel(
  externalSource: string | null | undefined,
): string {
  return ORIGIN_LABELS[resolveCatalogSourceOrigin(externalSource)];
}
