import { apiRequest } from "./client";
import type { LotCharacteristicPayload } from "../seller/lot-characteristics";

export { uploadSellerLotImage, type SellerLotUploadedImage } from "../seller/upload-seller-lot-image";

export type TaxonomyChild = { id: string; name: string; slug?: string };
export type TaxonomyProductType = { id: string; name: string; slug?: string; categoryId?: string };

export type ProductTypeCharacteristic = {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  unit: string | null;
  options: string[] | null;
  sortOrder: number;
  filterable: boolean;
};

export type ProductTypeCharacteristicsResponse = {
  productTypeId: string;
  categoryId: string;
  name: string;
  characteristics: ProductTypeCharacteristic[];
};

export type SellerPickupPoint = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export type SellerLotPublishContract = {
  id: string;
  status: string;
  isPublic: boolean;
  moderationState: string | null;
  publicProductId: string;
  publishOutcome: "PUBLISHED" | "PENDING_REVIEW" | "SAVED" | "FAILED";
};

export type SellerLotMutationResponse = {
  product: { id: string; title?: string; name?: string; status?: string };
  message?: string;
} & SellerLotPublishContract;

export type SellerLotDetail = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  city: string | null;
  condition: string;
  status: string;
  stock: number;
  pickupEnabled: boolean;
  category: { id: string; name: string; slug: string } | null;
  productType: { id: string; name: string } | null;
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number; isPrimary: boolean }>;
  pickupPoints: Array<{ id: string; name: string; city: string; address: string }>;
} & SellerLotPublishContract;

export async function fetchSellerPickupPoints() {
  return apiRequest<{ items: SellerPickupPoint[] }>("/api/mobile/seller/pickup-points");
}

export async function fetchTaxonomyBrowse(categoryId?: string | null) {
  const qs = new URLSearchParams();
  if (categoryId) qs.set("categoryId", categoryId);
  else qs.set("categoryId", "root");
  return apiRequest<{ children: TaxonomyChild[]; productTypes: TaxonomyProductType[] }>(
    `/api/taxonomy/browse?${qs.toString()}`,
  );
}

export async function fetchProductTypeCharacteristics(productTypeId: string) {
  return apiRequest<ProductTypeCharacteristicsResponse>(
    `/api/mobile/seller/product-types/${encodeURIComponent(productTypeId)}/characteristics`,
  );
}

/** Fallback for environments before mobile characteristics route is deployed. */
export async function fetchProductTypeCharacteristicsCompat(productTypeId: string) {
  try {
    return await fetchProductTypeCharacteristics(productTypeId);
  } catch {
    const legacy = await apiRequest<{
      id: string;
      categoryId: string;
      name: string;
      characteristics: ProductTypeCharacteristic[];
    }>(`/api/taxonomy/browse?productTypeId=${encodeURIComponent(productTypeId)}`);
    return {
      productTypeId: legacy.id,
      categoryId: legacy.categoryId,
      name: legacy.name,
      characteristics: legacy.characteristics ?? [],
    };
  }
}

export async function suggestProductType(title: string) {
  const result = await apiRequest<{
    productTypeSuggestion?: { id: string; name: string; categoryId: string } | null;
    categorySuggestion?: { id: string | null; name: string | null } | null;
  }>("/api/product-understanding", {
    method: "POST",
    body: JSON.stringify({ title }),
  }).catch(() => null);

  return {
    productTypeId: result?.productTypeSuggestion?.id ?? null,
    productTypeName: result?.productTypeSuggestion?.name ?? null,
    categoryId: result?.productTypeSuggestion?.categoryId ?? result?.categorySuggestion?.id ?? null,
    categoryName: result?.categorySuggestion?.name ?? null,
  };
}

export type CreateLotPayload = {
  title: string;
  description?: string | null;
  price: number;
  city?: string | null;
  condition: "NEW" | "USED" | "REFURBISHED";
  productTypeId?: string | null;
  categoryId?: string | null;
  images: Array<{ url: string; pathname?: string | null }>;
  stock?: number;
  status?: "ACTIVE" | "DRAFT";
  pickupEnabled?: boolean;
  pickupPointIds?: string[];
  characteristics?: LotCharacteristicPayload[];
};

export async function createSellerLot(payload: CreateLotPayload) {
  const pickupEnabled = payload.pickupEnabled ?? false;
  const pickupPointIds = pickupEnabled ? (payload.pickupPointIds ?? []) : [];
  return apiRequest<SellerLotMutationResponse>("/api/mobile/seller/products", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      stock: payload.stock ?? 1,
      pickupEnabled,
      reservationEnabled: false,
      prepaymentPercent: 0,
      pickupPointIds,
      characteristics: payload.characteristics ?? [],
    }),
  });
}

export async function updateSellerLot(productId: string, payload: Partial<CreateLotPayload>) {
  const pickupEnabled = payload.pickupEnabled ?? false;
  const pickupPointIds = pickupEnabled ? (payload.pickupPointIds ?? []) : [];
  return apiRequest<SellerLotMutationResponse>(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...payload,
        pickupEnabled,
        pickupPointIds,
        characteristics: payload.characteristics,
      }),
    },
  );
}

export async function publishSellerLot(productId: string, payload: Partial<CreateLotPayload>) {
  return apiRequest<SellerLotMutationResponse>(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...payload, status: "ACTIVE" }),
    },
  );
}

export async function fetchSellerLot(productId: string) {
  return apiRequest<SellerLotDetail>(`/api/mobile/seller/products/${encodeURIComponent(productId)}`);
}
