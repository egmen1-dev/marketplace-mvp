import * as SecureStore from "expo-secure-store";

import type { MobileProductListItem } from "../api/endpoints";

const KEY = "lot_recent_views_v1";
const MAX = 12;

type StoredView = Pick<MobileProductListItem, "id" | "title" | "price" | "compareAt" | "primaryImage" | "seller" | "stock" | "favoritesCount" | "views">;

export async function loadRecentViews(): Promise<StoredView[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredView[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export async function trackRecentView(product: MobileProductListItem): Promise<void> {
  const entry: StoredView = {
    id: product.id,
    title: product.title,
    price: product.price,
    compareAt: product.compareAt,
    primaryImage: product.primaryImage,
    seller: product.seller,
    stock: product.stock,
    favoritesCount: product.favoritesCount,
    views: product.views,
  };
  const prev = await loadRecentViews();
  const next = [entry, ...prev.filter((p) => p.id !== product.id)].slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}
