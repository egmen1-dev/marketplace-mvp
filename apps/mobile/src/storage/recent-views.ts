import * as SecureStore from "expo-secure-store";

const KEY = "lot_recent_views_v1";
const MAX = 12;

export type RecentViewItem = {
  id: string;
  title: string;
  price: number;
  compareAt?: number | null;
  primaryImage?: { url: string } | null;
  seller?: { storeName?: string };
  stock?: number;
  favoritesCount?: number;
  views?: number;
};

export async function loadRecentViews(): Promise<RecentViewItem[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentViewItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export async function trackRecentView(product: RecentViewItem): Promise<void> {
  const entry: RecentViewItem = {
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
