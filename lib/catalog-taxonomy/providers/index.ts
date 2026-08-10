/**
 * Resolve taxonomy provider: WB API when token present, else local snapshot.
 * Future: OzonProvider, YandexProvider, ManualProvider.
 */

import type { TaxonomyProvider } from "../types";
import { createWbProviderFromEnv } from "../wb/provider";
import { LocalSnapshotProvider } from "./snapshot";

export type ResolveProviderOptions = {
  /** Force snapshot even if WB token exists */
  preferSnapshot?: boolean;
  snapshotPath?: string;
};

export function resolveTaxonomyProvider(
  options?: ResolveProviderOptions,
): TaxonomyProvider {
  if (!options?.preferSnapshot) {
    const wb = createWbProviderFromEnv();
    if (wb) return wb;
  }
  return new LocalSnapshotProvider(options?.snapshotPath);
}
