import type { LotCharacteristicFormValue } from "./lot-characteristics";

import * as SecureStore from "expo-secure-store";

const DRAFT_KEY_V2 = "lot-draft-v2";
const DRAFT_KEY_V1 = "lot-draft-v1";

export type LotDraftImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  uploadStatus?: "idle" | "uploading" | "uploaded" | "failed";
  uploadError?: string | null;
  uriMissing?: boolean;
  uploadedUrl?: string;
  uploadedPathname?: string;
  uploadedId?: string;
};

export type LotDraft = {
  images: LotDraftImage[];
  title: string;
  description: string;
  price: string;
  city: string;
  condition: "NEW" | "REFURBISHED" | "USED";
  categoryId: string | null;
  categoryName: string | null;
  productTypeId: string | null;
  productTypeName: string | null;
  characteristicsProductTypeId: string | null;
  characteristicValues: Record<string, LotCharacteristicFormValue>;
  showOptionalCharacteristics: boolean;
  pickupEnabled: boolean;
  pickupPointIds: string[];
  savedProductId: string | null;
  stock: string;
  step: "photos" | "details" | "preview";
  updatedAt: string;
};

export const EMPTY_LOT_DRAFT: LotDraft = {
  images: [],
  title: "",
  description: "",
  price: "",
  city: "",
  condition: "NEW",
  categoryId: null,
  categoryName: null,
  productTypeId: null,
  productTypeName: null,
  characteristicsProductTypeId: null,
  characteristicValues: {},
  showOptionalCharacteristics: false,
  pickupEnabled: false,
  pickupPointIds: [],
  savedProductId: null,
  stock: "1",
  step: "photos",
  updatedAt: new Date().toISOString(),
};

export function isUnfinishedLot(draft: LotDraft | null | undefined): boolean {
  if (!draft) return false;
  return (
    draft.images.length > 0 ||
    draft.title.trim().length > 0 ||
    draft.description.trim().length > 0 ||
    draft.price.trim().length > 0 ||
    draft.city.trim().length > 0 ||
    Boolean(draft.categoryId) ||
    Boolean(draft.productTypeId) ||
    Object.keys(draft.characteristicValues ?? {}).length > 0 ||
    draft.pickupEnabled ||
    draft.pickupPointIds.length > 0
  );
}

function migrateV1(raw: Record<string, unknown>): LotDraft {
  return {
    ...EMPTY_LOT_DRAFT,
    images: (raw.images as LotDraftImage[]) ?? [],
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    price: String(raw.price ?? ""),
    city: String(raw.city ?? ""),
    condition: (raw.condition as LotDraft["condition"]) ?? "NEW",
    categoryId: (raw.categoryId as string | null) ?? null,
    categoryName: (raw.categoryName as string | null) ?? null,
    productTypeId: (raw.productTypeId as string | null) ?? null,
    productTypeName: (raw.productTypeName as string | null) ?? null,
    step: (raw.step as LotDraft["step"]) ?? "photos",
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeCharacteristicValues(
  raw: unknown,
): Record<string, LotCharacteristicFormValue> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, LotCharacteristicFormValue> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    out[id] = {
      text: typeof v.text === "string" ? v.text : undefined,
      number: typeof v.number === "string" ? v.number : undefined,
      boolean: typeof v.boolean === "boolean" ? v.boolean : undefined,
      multi: Array.isArray(v.multi) ? v.multi.map(String) : undefined,
    };
  }
  return out;
}

function normalizeDraft(raw: Record<string, unknown>): LotDraft {
  return {
    ...EMPTY_LOT_DRAFT,
    images: Array.isArray(raw.images) ? (raw.images as LotDraftImage[]) : [],
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    price: String(raw.price ?? ""),
    city: String(raw.city ?? ""),
    condition: (raw.condition as LotDraft["condition"]) ?? "NEW",
    categoryId: (raw.categoryId as string | null) ?? null,
    categoryName: (raw.categoryName as string | null) ?? null,
    productTypeId: (raw.productTypeId as string | null) ?? null,
    productTypeName: (raw.productTypeName as string | null) ?? null,
    characteristicsProductTypeId: (raw.characteristicsProductTypeId as string | null) ?? null,
    characteristicValues: normalizeCharacteristicValues(raw.characteristicValues),
    showOptionalCharacteristics: Boolean(raw.showOptionalCharacteristics),
    pickupEnabled: Boolean(raw.pickupEnabled),
    pickupPointIds: Array.isArray(raw.pickupPointIds) ? (raw.pickupPointIds as string[]) : [],
    savedProductId: (raw.savedProductId as string | null) ?? null,
    stock: String(raw.stock ?? "1"),
    step: (raw.step as LotDraft["step"]) ?? "photos",
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export async function loadLotDraft(): Promise<LotDraft | null> {
  try {
    const rawV2 = await SecureStore.getItemAsync(DRAFT_KEY_V2);
    if (rawV2) return normalizeDraft(JSON.parse(rawV2) as Record<string, unknown>);

    const rawV1 = await SecureStore.getItemAsync(DRAFT_KEY_V1);
    if (!rawV1) return null;
    const migrated = migrateV1(JSON.parse(rawV1) as Record<string, unknown>);
    await saveLotDraft(migrated);
    await SecureStore.deleteItemAsync(DRAFT_KEY_V1);
    return migrated;
  } catch {
    return null;
  }
}

export async function saveLotDraft(draft: LotDraft): Promise<void> {
  await SecureStore.setItemAsync(
    DRAFT_KEY_V2,
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
  );
}

export async function clearLotDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(DRAFT_KEY_V2);
  await SecureStore.deleteItemAsync(DRAFT_KEY_V1);
}
