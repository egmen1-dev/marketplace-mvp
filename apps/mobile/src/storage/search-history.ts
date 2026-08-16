import * as SecureStore from "expo-secure-store";

const KEY = "lot_search_history_v1";
const MAX = 8;

export async function loadSearchHistory(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export async function pushSearchHistory(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return loadSearchHistory();
  const prev = await loadSearchHistory();
  const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export const POPULAR_SEARCHES = ["наушники", "кроссовки", "iphone", "доставка сегодня"];
