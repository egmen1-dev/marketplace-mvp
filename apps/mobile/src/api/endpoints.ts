import { apiRequest } from "../api/client";
import type { BootstrapPayload } from "../types/api";

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  return apiRequest<BootstrapPayload>("/api/mobile/bootstrap");
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
    intelligence: { topAction: string | null; productId: string | null };
  }>("/api/mobile/seller/home");
}

export async function fetchCatalog(params?: { q?: string; cursor?: string | null }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return apiRequest<{ items: Array<Record<string, unknown>>; nextCursor: string | null; hasMore: boolean }>(
    `/api/mobile/catalog/products${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchProduct(id: string) {
  return apiRequest<Record<string, unknown>>(`/api/products/${id}`);
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
  return apiRequest<{ items: Array<Record<string, unknown>> }>("/api/mobile/favorites");
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
}) {
  try {
    await apiRequest("/api/mobile/telemetry", {
      method: "POST",
      body: JSON.stringify({
        appVersion: "0.1.0-alpha",
        platform: "android",
        ...event,
      }),
    });
  } catch {
    // telemetry must not block UX
  }
}
