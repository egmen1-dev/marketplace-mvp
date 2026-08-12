/**
 * Taxonomy Import Engine types — suggestion/review layer over Catalog Core.
 */

import type { NormalizedTaxonomy } from "../types";

export type ImportBatchStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";

export type ImportItemStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";

export type ImportEntityType =
  | "CATEGORY"
  | "PRODUCT_TYPE"
  | "CHARACTERISTIC"
  | "ALIAS";

export type ImportAction =
  | "CREATE"
  | "UPDATE"
  | "MERGE"
  | "SKIP"
  | "REVIEW"
  | "SOFT_DEACTIVATE";

export type PlannedImportItem = {
  externalId: string | null;
  entityType: ImportEntityType;
  action: ImportAction;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  confidence: number;
  status: ImportItemStatus;
  reason: string | null;
  targetId: string | null;
};

export type ImportStatistics = {
  created: number;
  updated: number;
  duplicates: number;
  needReview: number;
  rejected: number;
  skipped: number;
  softDeactivate: number;
  characteristicMaps: number;
};

export type ImportPlan = {
  source: string;
  version: string;
  hash: string;
  taxonomy: NormalizedTaxonomy;
  items: PlannedImportItem[];
  statistics: ImportStatistics;
  seoPaths: {
    categoryPaths: string[];
    productTypePaths: string[];
  };
};

export type DryRunReport = {
  batchId: string | null;
  source: string;
  version: string;
  hash: string;
  statistics: ImportStatistics;
  sample: PlannedImportItem[];
  dryRun: true;
};

export type ApplyReport = {
  batchId: string;
  appliedItems: number;
  sync: Record<string, number | string> | null;
  unify: Record<string, number> | null;
  merges: number;
  dryRun: false;
};
