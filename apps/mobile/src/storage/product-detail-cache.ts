import * as SecureStore from "expo-secure-store";

const KEY = "lot_product_detail_cache_v1";
const MAX = 24;

type CacheEntry = {
  id: string;
  savedAt: number;
  data: Record<string, unknown>;
};

type CacheBlob = {
  entries: CacheEntry[];
};

async function readBlob(): Promise<CacheBlob> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return { entries: [] };
  try {
    const parsed = JSON.parse(raw) as CacheBlob;
    return Array.isArray(parsed.entries) ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

export async function cacheProductDetail(id: string, data: Record<string, unknown>): Promise<void> {
  const blob = await readBlob();
  const next: CacheEntry[] = [{ id, savedAt: Date.now(), data }, ...blob.entries.filter((e) => e.id !== id)].slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify({ entries: next }));
}

export async function loadCachedProductDetail(id: string): Promise<Record<string, unknown> | null> {
  const blob = await readBlob();
  const hit = blob.entries.find((e) => e.id === id);
  return hit?.data ?? null;
}
