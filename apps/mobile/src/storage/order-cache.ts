import * as SecureStore from "expo-secure-store";

const LIST_KEY = "lot_orders_list_cache_v1";
const DETAIL_PREFIX = "lot_order_detail_v1:";
const MAX_DETAILS = 12;

type ListCache = {
  savedAt: number;
  items: Record<string, unknown>[];
};

export async function cacheOrdersList(items: Record<string, unknown>[]): Promise<void> {
  const payload: ListCache = { savedAt: Date.now(), items };
  await SecureStore.setItemAsync(LIST_KEY, JSON.stringify(payload));
}

export async function loadCachedOrdersList(): Promise<Record<string, unknown>[] | null> {
  const raw = await SecureStore.getItemAsync(LIST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ListCache;
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

export async function cacheOrderDetail(id: string, data: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(`${DETAIL_PREFIX}${id}`, JSON.stringify({ savedAt: Date.now(), data }));
  const indexRaw = await SecureStore.getItemAsync(`${DETAIL_PREFIX}index`);
  const ids: string[] = indexRaw ? (JSON.parse(indexRaw) as string[]) : [];
  const next = [id, ...ids.filter((entry) => entry !== id)].slice(0, MAX_DETAILS);
  await SecureStore.setItemAsync(`${DETAIL_PREFIX}index`, JSON.stringify(next));
}

export async function loadCachedOrderDetail(id: string): Promise<Record<string, unknown> | null> {
  const raw = await SecureStore.getItemAsync(`${DETAIL_PREFIX}${id}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { data?: Record<string, unknown> };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export async function listCachedOrderDetailIds(): Promise<string[]> {
  const indexRaw = await SecureStore.getItemAsync(`${DETAIL_PREFIX}index`);
  if (!indexRaw) return [];
  try {
    const ids = JSON.parse(indexRaw) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}
