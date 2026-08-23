import { apiRequest } from "../api/client";
import type { BootstrapPayload } from "../types/api";
import { getDeviceId } from "../storage/secure-session";
import { loadAppConfig } from "../config/env";
import { getSessionId } from "../telemetry/session";
import { getMobileUpdateChannel } from "./update-channel";

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
  averageRating?: number | null;
  reviewsCount?: number;
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
    channel: getMobileUpdateChannel(),
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
    sales: { todayCount: number; awaitingCount: number; messagesUnread: number };
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

export async function fetchCategories() {
  return apiRequest<{
    items: Array<{ id: string; name: string; slug: string; productCount?: number; catalogProductCount?: number; level?: number }>;
  }>("/api/categories");
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

export type ProductReviewDto = {
  id: string;
  rating: number;
  text: string | null;
  pros: string | null;
  cons: string | null;
  buyerName: string | null;
  createdAt: string;
  photos: { id: string; url: string }[];
};

export type ProductRatingSnapshot = {
  averageRating: number;
  reviewsCount: number;
  distribution: { stars: number; percent: number; count: number }[];
};

export async function fetchProductReviews(productId: string, cursor?: string | null) {
  const qs = new URLSearchParams();
  if (cursor) qs.set("cursor", cursor);
  const suffix = qs.toString();
  return apiRequest<{
    rating: ProductRatingSnapshot | null;
    items: ProductReviewDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }>(`/api/mobile/products/${encodeURIComponent(productId)}/reviews${suffix ? `?${suffix}` : ""}`);
}

export async function fetchCart() {
  return apiRequest<Record<string, unknown>>("/api/cart");
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
  metadata?: Record<string, unknown>;
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
        ...event,
      }),
    });
  } catch {
    // telemetry must not block UX
  }
}

export async function submitProductFeedback(input: {
  content: string;
  screen?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}) {
  const appConfig = loadAppConfig();
  return apiRequest<{ classification: string; recorded: boolean }>("/api/product-ops/feedback", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      screen: input.screen,
      category: input.category,
      metadata: input.metadata,
      deviceId: getDeviceId(),
      versionCode: Number(appConfig.buildNumber) || 1,
    }),
  });
}

export type CheckoutWebUrlPayload = {
  strategy: string;
  checkoutUrl: string;
  handoffUrl: string;
  returnDeepLink: string;
  expiresInSec: number;
};

export async function fetchCheckoutWebUrl(): Promise<CheckoutWebUrlPayload> {
  return apiRequest<CheckoutWebUrlPayload>("/api/mobile/checkout/web-url");
}

export type ConversationListItem = {
  id: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  unreadCount: number;
  product: {
    id: string;
    title: string;
    price: number;
    currency: string;
    imageUrl: string | null;
  };
  counterpart: { name: string; kind: "buyer" | "seller" };
  lastMessage: {
    text: string;
    type: string;
    createdAt: string;
    senderId: string | null;
  } | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  text: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  senderId: string | null;
  sender: { id: string; name: string | null; email: string; image: string | null } | null;
};

export type ConversationDetail = {
  id: string;
  status: string;
  product: ConversationListItem["product"];
  buyer: { id: string; name: string | null; email: string; image: string | null };
  seller: {
    id: string;
    storeName: string;
    slug: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  };
  messages: ChatMessage[];
};

export async function fetchConversations() {
  return apiRequest<{ items: ConversationListItem[]; unreadTotal: number }>("/api/mobile/conversations");
}

export async function fetchConversationsUnread() {
  return apiRequest<{ unreadTotal: number }>("/api/mobile/conversations/unread");
}

export async function createConversation(productId: string) {
  return apiRequest<{ conversationId: string; created: boolean }>("/api/mobile/conversations", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export async function fetchConversation(conversationId: string) {
  return apiRequest<ConversationDetail>(`/api/mobile/conversations/${encodeURIComponent(conversationId)}`);
}

export async function fetchConversationMessages(conversationId: string, cursor?: string | null) {
  const qs = new URLSearchParams();
  if (cursor) qs.set("cursor", cursor);
  const suffix = qs.toString();
  return apiRequest<{ items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }>(
    `/api/mobile/conversations/${encodeURIComponent(conversationId)}/messages${suffix ? `?${suffix}` : ""}`,
  );
}

export async function sendConversationMessage(conversationId: string, body: string) {
  return apiRequest<{ message: ChatMessage }>(
    `/api/mobile/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

export async function markConversationRead(conversationId: string) {
  return apiRequest<{ unreadCount: number }>(
    `/api/mobile/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function fetchOrder(orderId: string) {
  return apiRequest<Record<string, unknown>>(`/api/orders/${encodeURIComponent(orderId)}`);
}

export type MobileSellerOrderTab = "new" | "in_progress" | "completed";

export type MobileSellerOrder = {
  id: string;
  orderNumber: string;
  status: "NEW" | "CONFIRMED" | "SHIPPED" | "COMPLETED" | "CANCELLED";
  rawStatus: string;
  product: { id: string | null; title: string; imageUrl: string | null };
  quantity: number;
  amount: number;
  currency: string;
  buyer: { name: string | null; email: string };
  createdAt: string;
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
};

export async function fetchSellerOrders(tab: MobileSellerOrderTab = "new") {
  return apiRequest<{ orders: MobileSellerOrder[]; tab: MobileSellerOrderTab; total: number }>(
    `/api/mobile/seller/orders?tab=${encodeURIComponent(tab)}`,
  );
}

export async function patchSellerOrderStatus(orderId: string, status: string) {
  return apiRequest<{ id: string; status: string; rawStatus: string }>(
    `/api/mobile/seller/orders/${encodeURIComponent(orderId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export async function fetchWebHandoffUrl(dest: string) {
  const qs = new URLSearchParams({ dest });
  return apiRequest<{ handoffUrl: string; destination: string; returnDeepLink: string; expiresInSec: number }>(
    `/api/mobile/web-handoff/url?${qs.toString()}`,
  );
}

export type MobileSellerStorefront = {
  id: string;
  storeName: string;
  kindLabel: string;
  badges: string[];
  activeProducts: number;
  joinedLabel: string | null;
  respondsInChat: boolean;
};

export async function fetchSellerStorefront(sellerId: string) {
  return apiRequest<MobileSellerStorefront>(`/api/mobile/seller/${encodeURIComponent(sellerId)}`);
}
