/**
 * Shared taxonomy types (source-agnostic).
 * WB IDs are never used as LOT primary keys.
 */

export type CharacteristicType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "SELECT"
  | "MULTISELECT"
  | "COLOR"
  | "SIZE";

export type NormalizedCategory = {
  /** Stable key within a sync run (slug or external id) */
  key: string;
  name: string;
  slug: string;
  parentKey: string | null;
  level: number;
  path: string;
  sortOrder: number;
  externalSource: string;
  externalId: string;
  externalName: string;
};

export type NormalizedCharacteristic = {
  key: string;
  name: string;
  slug: string;
  type: CharacteristicType;
  required: boolean;
  unit?: string | null;
  options?: string[] | null;
  sortOrder: number;
  filterable: boolean;
  externalId: string;
  externalSource: string;
};

export type NormalizedProductType = {
  key: string;
  name: string;
  slug: string;
  categoryKey: string;
  sortOrder: number;
  externalSource: string;
  externalId: string;
  externalName: string;
  aliases?: string[];
  characteristics: NormalizedCharacteristic[];
};

export type NormalizedTaxonomy = {
  source: string;
  fetchedAt: string;
  categories: NormalizedCategory[];
  productTypes: NormalizedProductType[];
};

export type TaxonomyProviderName =
  | "wildberries"
  | "snapshot"
  | "manual"
  | "ozon"
  | "yandex";

export interface TaxonomyProvider {
  readonly name: TaxonomyProviderName;
  fetchTaxonomy(): Promise<NormalizedTaxonomy>;
}

export type MatchCandidate = {
  productTypeId: string;
  name: string;
  slug: string;
  categoryId: string;
  breadcrumb: string[];
  aliases: string[];
};

export type MatchResult = {
  productTypeId: string;
  name: string;
  breadcrumb: string[];
  confidence: number;
  matchedTerms: string[];
};
