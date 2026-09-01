import * as SecureStore from "expo-secure-store";

import { SEARCH_HISTORY_LIMIT, updateSearchHistory } from "../commerce/search-state";

const KEY = "lot_search_history_v1";

export async function loadSearchHistory(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.reduceRight<string[]>((items, value) => (typeof value === "string" ? updateSearchHistory(items, value) : items), [])
      : [];
  } catch {
    return [];
  }
}

export async function pushSearchHistory(query: string): Promise<string[]> {
  const prev = await loadSearchHistory();
  const next = updateSearchHistory(prev, query, SEARCH_HISTORY_LIMIT);
  if (next.length === prev.length && next.every((value, index) => value === prev[index])) return prev;
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
