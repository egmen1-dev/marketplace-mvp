/** Client-side: show debug overlay when ?debug=marketplace */
export function isMarketplaceDebugQuery(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("debug") === "marketplace";
}
