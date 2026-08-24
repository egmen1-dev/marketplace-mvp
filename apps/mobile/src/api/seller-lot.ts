import { loadAppConfig } from "../config/env";
import { getAccessToken } from "../storage/secure-session";
import { apiRequest } from "./client";

export type TaxonomyChild = { id: string; name: string; slug?: string };
export type TaxonomyProductType = { id: string; name: string; slug?: string; categoryId?: string };

export type SellerPickupPoint = {
  id: string;
  name: string;
  city: string;
  address: string;
};

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

export async function uploadSellerLotImage(localUri: string, fileName = "lot.jpg") {
  const config = loadAppConfig();
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", {
    uri: localUri,
    name: fileName,
    type: "image/jpeg",
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}/api/mobile/seller/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new Error("Не удалось загрузить фото");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const serverError = (body as { error?: string }).error ?? "Не удалось загрузить фото";
    throw new Error(serverError);
  }

  const data = (await res.json()) as { url: string; pathname?: string };
  return { url: data.url, pathname: data.pathname ?? null };
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
};

export async function createSellerLot(payload: CreateLotPayload) {
  const pickupEnabled = payload.pickupEnabled ?? false;
  const pickupPointIds = pickupEnabled ? (payload.pickupPointIds ?? []) : [];
  return apiRequest<{ product: { id: string; title?: string; name?: string }; message?: string }>(
    "/api/mobile/seller/products",
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        stock: payload.stock ?? 1,
        pickupEnabled,
        reservationEnabled: false,
        prepaymentPercent: 0,
        pickupPointIds,
        characteristics: [],
      }),
    },
  );
}

export async function updateSellerLot(productId: string, payload: Partial<CreateLotPayload>) {
  const pickupEnabled = payload.pickupEnabled ?? false;
  const pickupPointIds = pickupEnabled ? (payload.pickupPointIds ?? []) : [];
  return apiRequest<{ product: { id: string }; message?: string }>(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...payload,
        pickupEnabled,
        pickupPointIds,
      }),
    },
  );
}

export async function publishSellerLot(productId: string, payload: Partial<CreateLotPayload>) {
  return apiRequest<{ product: { id: string }; message?: string }>(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...payload, status: "ACTIVE" }),
    },
  );
}
