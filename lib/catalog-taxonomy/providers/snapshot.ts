/**
 * Local snapshot taxonomy provider — used when WB API is unavailable.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { NormalizedTaxonomy, TaxonomyProvider } from "../types";

export class LocalSnapshotProvider implements TaxonomyProvider {
  readonly name = "snapshot" as const;

  constructor(private filePath?: string) {}

  async fetchTaxonomy(): Promise<NormalizedTaxonomy> {
    const resolved =
      this.filePath ??
      process.env.TAXONOMY_SNAPSHOT_PATH ??
      path.join(process.cwd(), "data/taxonomy/wb-taxonomy.json");
    const raw = await readFile(resolved, "utf8");
    const data = JSON.parse(raw) as NormalizedTaxonomy;
    if (!data.categories || !data.productTypes) {
      throw new Error(`Invalid taxonomy snapshot: ${resolved}`);
    }
    return {
      ...data,
      source: data.source || "snapshot",
      fetchedAt: data.fetchedAt || new Date().toISOString(),
    };
  }
}
