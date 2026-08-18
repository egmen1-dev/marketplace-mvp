import { apiRequest } from "../api/client";
import type { BootstrapPayload } from "../types/api";
import { getDeviceId } from "../storage/secure-session";
import { loadAppConfig } from "../config/env";
import { getSessionId } from "../telemetry/session";

export type MobileUpdateState =
  | "NO_UPDATE"
  | "OPTIONAL_UPDATE"
  | "RECOMMENDED_UPDATE"
  | "REQUIRED_UPDATE"
  | "UNSUPPORTED_CLIENT";

export type MobileUpdateInfo = {
  latestVersion: string;
  versionCode: number;
  versionName: string;
  minimumVersionName?: string;
  minimumVersionCode?: number;
  reason?: "CLIENT_TOO_OLD";
  updateRequired: boolean;
  updateState: MobileUpdateState;
  mandatory: boolean;
  downloadUrl: string | null;
  sha256: string | null;
  artifactSizeBytes?: number | null;
  releaseNotes: string[];
  channel: string;
  rollout: { percent: number; eligible: boolean };
  compatibility: {
    compatible: boolean;
    forceUpgrade: boolean;
  };
  previousRelease?: { versionName: string; versionCode: number; downloadUrl: string | null } | null;
  knownIssues?: string[];
};

export type CatalogParams = {
  q?: string;
  cursor?: string | null;
  sort?: "popular" | "newest" | "price_asc" | "price_desc";
  sellerId?: string;
  categoryId?: string;
  inStock?: boolean;
};

export type MobileProductListItem = {
  id: string;
  title: string;
  price: number;
  compareAt?: number | null;
  stock?: number;
  status?: string;
  favoritesCount?: number;
  views?: number;
  primaryImage?: { url: string } | null;
  seller?: { storeName?: string; id?: string };
  category?: { id: string; name: string; slug?: string } | null;
  images?: Array<{ url: string }>;
  description?: string | null;
  city?: string | null;
  condition?: string;
};

export async function fetchMobileUpdate(): Promise<MobileUpdateInfo> {
  const config = loadAppConfig();
  const versionCode = Number(config.buildNumber) || 1;
  const deviceId = getDeviceId();
  const qs = new URLSearchParams({
    versionCode: String(versionCode),
    deviceId,
    channel: "CLOSED_ALPHA",
  });
  const raw = await apiRequest<
    MobileUpdateInfo & {
      updateState?: MobileUpdateState;
      minimumVersionName?: string;
      minimumVersionCode?: number;
      reason?: "CLIENT_TOO_OLD";
    }
  >(`/api/mobile/update?${qs.toString()}`);
  const updateState =
    raw.updateState ??
    (raw.reason === "CLIENT_TOO_OLD"
      ? "UNSUPPORTED_CLIENT"
      : raw.updateRequired || raw.mandatory
        ? "REQUIRED_UPDATE"
        : raw.downloadUrl && raw.versionCode > versionCode && raw.rollout.eligible
          ? "OPTIONAL_UPDATE"
          : "NO_UPDATE");
  return {
    ...raw,
    updateState,
    minimumVersionName: raw.minimumVersionName,
    minimumVersionCode: raw.minimumVersionCode,
    reason: raw.reason,
  };
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  return apiRequest<BootstrapPayload>("/api/mobile/bootstrap");
}

export type RemoteConfigPayload = {
  surface: string;
  config: Record<string, unknown>;
  flags: Array<{ key: string; stage: string; enabled: boolean }>;
  experiments: Array<{ key: string; name: string; variant: { id: string; name: string } }>;
};

export async function fetchRemoteConfig(): Promise<RemoteConfigPayload> {
  const deviceId = getDeviceId();
  return apiRequest<RemoteConfigPayload>(`/api/product-ops/config?surface=mobile&deviceId=${encodeURIComponent(deviceId)}`);
}

export async function fetchMobileConfig() {
  return apiRequest<Record<string, unknown>>("/api/mobile/config");
}

export async function fetchNavigation() {
  return apiRequest<{ items: Array<{ id: string; label: string; deepLink: string }> }>("/api/mobile/navigation");
}

export async function fetchBuyerHome() {
  return apiRequest<{
    discovery: { featuredCount: number };
    favourites: { count: number };
    orders: { active: number };
    recommendations: { available: boolean };
  }>("/api/mobile/buyer/home");
}

export async function fetchSellerHome() {
  return apiRequest<{
    money: { available: number; pending: number };
    orders: { needAction: number };
    products: { active: number; needAttention: number };
    promotion: { active: number };
    intelligence: { topAction: string | null; productId: string | null; confidence?: number; reason?: string };
  }>("/api/mobile/seller/home");
}

export async function fetchCatalog(params?: CatalogParams) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.sort) search.set("sort", params.sort);
  if (params?.sellerId) search.set("sellerId", params.sellerId);
  if (params?.categoryId) search.set("categoryId", params.categoryId);
  if (params?.inStock) search.set("inStock", "1");
  const qs = search.toString();
  return apiRequest<{ items: MobileProductListItem[]; nextCursor: string | null; hasMore: boolean }>(
    `/api/mobile/catalog/products${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchSellerProducts(params?: { cursor?: string | null }) {
  const search = new URLSearchParams();
  if (params?.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return apiRequest<{ items: MobileProductListItem[]; nextCursor: string | null; hasMore: boolean }>(
    `/api/mobile/seller/products${qs ? `?${qs}` : ""}`,
  );
}

export type MobileSellerOrderItem = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  isOverdue: boolean;
  total: number;
  sellerSubtotal: number;
  currency: string;
  createdAt: string;
  buyerName: string | null;
  itemCount: number;
  sellerItemNames: string[];
};

export async function fetchSellerOrders(params?: { cursor?: string | null }) {
  const search = new URLSearchParams();
  if (params?.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return apiRequest<{ items: MobileSellerOrderItem[]; nextCursor: string | null; hasMore: boolean }>(
    `/api/mobile/seller/orders${qs ? `?${qs}` : ""}`,
  );
}

export type MobileSellerPublicProfile = {
  id: string;
  storeName: string;
  slug: string | null;
  description: string | null;
  isVerified: boolean;
  productCount: number;
  available: boolean;
};

export async function fetchSellerPublicProfile(sellerId: string) {
  return apiRequest<MobileSellerPublicProfile>(`/api/mobile/seller/public/${encodeURIComponent(sellerId)}`);
}

export async function fetchCategories() {
  return apiRequest<{ items: Array<{ id: string; name: string; slug: string; productCount?: number }> }>("/api/categories");
}

export async function fetchProductSuggest(q: string) {
  const qs = new URLSearchParams({ q, limit: "8" });
  return apiRequest<{ items: Array<{ type: string; id: string; title: string; slug: string }>; q: string }>(
    `/api/products/suggest?${qs.toString()}`,
  );
}

export async function fetchProduct(id: string) {
  return apiRequest<Record<string, unknown>>(`/api/products/${id}`);
}

export type CartApiView = {
  items: Array<{
    productId: string;
    quantity: number;
    lineTotal: number;
    product?: {
      id?: string;
      title?: string;
      price?: number;
      stock?: number;
      primaryImage?: { url?: string } | null;
    };
  }>;
  itemCount: number;
  subtotal: number;
  currency: string;
};

export type DeliveryQuoteResponse = {
  quote: {
    cost: number;
    currency: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
  etaLabel: string;
  source: string;
};

export type DeliveryPointsResponse = {
  points: Array<{
    code: string;
    name: string;
    address: string;
    city: string;
    workTime?: string;
  }>;
};

export async function fetchCart() {
  return apiRequest<CartApiView>("/api/cart");
}

export async function fetchDeliveryQuote(body: {
  method: "PICKUP" | "COURIER";
  city: string;
  pickupPointCode?: string;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}) {
  return apiRequest<DeliveryQuoteResponse>("/api/delivery/quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchDeliveryPoints(city: string) {
  const qs = new URLSearchParams({ city });
  return apiRequest<DeliveryPointsResponse>(`/api/delivery/points?${qs.toString()}`);
}

export async function addToCart(productId: string, quantity = 1) {
  return apiRequest<Record<string, unknown>>("/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function removeCartItem(productId: string) {
  return apiRequest<Record<string, unknown>>(`/api/cart?productId=${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}

export async function updateCartQuantity(productId: string, quantity: number) {
  return apiRequest<Record<string, unknown>>("/api/cart", {
    method: "PATCH",
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function fetchOrders() {
  return apiRequest<{ items: Array<Record<string, unknown>> }>("/api/orders");
}

export async function fetchOrderDetail(orderId: string) {
  return apiRequest<Record<string, unknown>>(`/api/orders/${encodeURIComponent(orderId)}`);
}

export async function fetchWallet() {
  return apiRequest<{ spendable: number; withdrawable: number; pending: number; enabled: boolean }>("/api/mobile/wallet");
}

export async function fetchFavorites() {
  return apiRequest<{ items: MobileProductListItem[] }>("/api/mobile/favorites");
}

export async function toggleFavorite(productId: string) {
  return apiRequest<{ isFavorite: boolean }>("/api/mobile/favorites", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export async function postTelemetry(event: {
  screen: string;
  event: string;
  errorCode?: string;
  bootId?: string;
}) {
  const appConfig = loadAppConfig();
  try {
    await apiRequest("/api/mobile/telemetry", {
      method: "POST",
      body: JSON.stringify({
        appVersion: appConfig.appVersion,
        platform: "android",
        sessionId: getSessionId(),
        deviceId: getDeviceId(),
        versionCode: Number(appConfig.buildNumber) || 1,
        bootId: event.bootId,
        ...event,
      }),
    });
  } catch {
    // telemetry must not block UX
  }
}

export async function submitProductFeedback(input: { content: string; screen?: string }) {
  const appConfig = loadAppConfig();
  return apiRequest<{ classification: string; recorded: boolean }>("/api/product-ops/feedback", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      screen: input.screen,
      deviceId: getDeviceId(),
      versionCode: Number(appConfig.buildNumber) || 1,
    }),
  });
}
