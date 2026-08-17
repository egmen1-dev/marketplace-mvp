import * as SecureStore from "expo-secure-store";

import type { MobileProductListItem } from "../api/endpoints";

const LIST_KEY = "lot_favorites_list_cache_v1";

type ListCache = {
  savedAt: number;
  items: MobileProductListItem[];
};

export async function cacheFavoritesList(items: MobileProductListItem[]): Promise<void> {
  const payload: ListCache = { savedAt: Date.now(), items };
  await SecureStore.setItemAsync(LIST_KEY, JSON.stringify(payload));
}

export async function loadCachedFavoritesList(): Promise<MobileProductListItem[] | null> {
  const raw = await SecureStore.getItemAsync(LIST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ListCache;
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}
