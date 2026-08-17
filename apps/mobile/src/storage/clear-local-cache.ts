import * as SecureStore from "expo-secure-store";

const KEYS = [
  "lot_favorites_list_cache_v1",
  "lot_orders_list_cache_v1",
  "lot_recent_views_v1",
  "lot_profile_snapshot_v1",
  "lot_search_history_v1",
  "lot_product_detail_cache_v1",
  "lot_remote_config_cache_v1",
  "lot_last_boot_report_v1",
  "lot_boot_history_v1",
];

export async function clearLocalAppCache(): Promise<void> {
  await Promise.all(
    KEYS.map(async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // best effort
      }
    }),
  );

  const orderIndex = await SecureStore.getItemAsync("lot_order_detail_v1:index");
  if (orderIndex) {
    try {
      const ids = JSON.parse(orderIndex) as string[];
      if (Array.isArray(ids)) {
        await Promise.all(ids.map((id) => SecureStore.deleteItemAsync(`lot_order_detail_v1:${id}`).catch(() => undefined)));
      }
    } catch {
      // ignore
    }
    await SecureStore.deleteItemAsync("lot_order_detail_v1:index").catch(() => undefined);
  }
}
