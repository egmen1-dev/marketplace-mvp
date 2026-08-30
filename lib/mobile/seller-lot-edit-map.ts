import type { LotCharacteristicFormValue } from "./lot-characteristics";

export type SellerLotCharacteristicRow = {
  definitionId: string;
  formValue: string;
  type?: string;
};

export type SellerLotEditSource = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  city: string | null;
  condition: string;
  status: string;
  stock: number;
  pickupEnabled: boolean;
  moderationState: string | null;
  category: { id: string; name: string; slug: string } | null;
  productType: { id: string; name: string } | null;
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number; isPrimary: boolean }>;
  pickupPoints: Array<{ id: string; name: string; city: string; address: string }>;
  characteristicValues?: SellerLotCharacteristicRow[];
};

export type SellerLotEditDraft = {
  images: Array<{
    uri: string;
    uploadedUrl: string;
    uploadStatus: "uploaded";
    uploadedId: string;
  }>;
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
  pickupEnabled: boolean;
  pickupPointIds: string[];
  savedProductId: string;
  stock: string;
  step: "photos";
};

export function mapCharacteristicFormValues(
  rows: SellerLotCharacteristicRow[] | undefined,
): Record<string, LotCharacteristicFormValue> {
  const out: Record<string, LotCharacteristicFormValue> = {};
  for (const row of rows ?? []) {
    const raw = row.formValue?.trim();
    if (!raw) continue;
    const type = (row.type ?? "TEXT").toUpperCase();
    if (type === "BOOLEAN") {
      out[row.definitionId] = { boolean: raw === "true" };
    } else if (type === "NUMBER" || type === "SIZE") {
      out[row.definitionId] = { number: raw };
    } else if (type === "MULTISELECT") {
      out[row.definitionId] = { multi: raw.split(",").map((part) => part.trim()).filter(Boolean) };
    } else {
      out[row.definitionId] = { text: raw };
    }
  }
  return out;
}

export function mapSellerLotImages(images: SellerLotEditSource["images"]) {
  return [...images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      uri: img.url,
      uploadedUrl: img.url,
      uploadStatus: "uploaded" as const,
      uploadedId: img.id,
    }));
}

export function mapSellerLotToEditDraft(lot: SellerLotEditSource): SellerLotEditDraft {
  return {
    images: mapSellerLotImages(lot.images),
    title: lot.title,
    description: lot.description ?? "",
    price: String(lot.price),
    city: lot.city ?? "",
    condition: (lot.condition as SellerLotEditDraft["condition"]) ?? "NEW",
    categoryId: lot.category?.id ?? null,
    categoryName: lot.category?.name ?? null,
    productTypeId: lot.productType?.id ?? null,
    productTypeName: lot.productType?.name ?? null,
    characteristicsProductTypeId: lot.productType?.id ?? null,
    characteristicValues: mapCharacteristicFormValues(lot.characteristicValues),
    pickupEnabled: lot.pickupEnabled,
    pickupPointIds: lot.pickupPoints.map((point) => point.id),
    savedProductId: lot.id,
    stock: String(lot.stock),
    step: "photos",
  };
}

export function resolveEditPublishAllowed(lot: Pick<SellerLotEditSource, "status" | "moderationState">): boolean {
  return lot.moderationState === "NEEDS_FIX" || lot.status === "DRAFT";
}

export function resolveEditPersistStatus(lot: Pick<SellerLotEditSource, "status">): "ACTIVE" | "DRAFT" {
  return lot.status === "ACTIVE" ? "ACTIVE" : "DRAFT";
}
