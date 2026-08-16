export type { AppId, EntityType } from "./types";

export const APP_IDS = [
  "marketplace",
  "daos",
  "quicksale",
  "crm",
  "erp",
  "wms",
  "pim",
  "advertising",
  "unknown",
] as const;

export const ENTITY_TYPES = [
  "product",
  "sku",
  "seller",
  "buyer",
  "campaign",
  "order",
  "query",
  "category",
  "image",
  "video",
  "marketplace",
] as const;
