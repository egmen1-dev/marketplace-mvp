import type { MobileBuildInfo } from "../../config/build-info";
import type { MobileUpdateInfo } from "../../api/endpoints";
import type { StoredSessionMeta } from "../../storage/secure-session";

export type ProfileShoppingStats = {
  ordersCount: number | null;
  favoritesCount: number | null;
  recentViewsCount: number | null;
  cartCount: number | null;
};

export type ProfileCategoryStat = {
  id: string;
  name: string;
  count: number;
};

export type ProfileSnapshot = {
  savedAt: number;
  meta: StoredSessionMeta | null;
  displayName: string;
  displayEmail: string;
  buildInfo: MobileBuildInfo;
  stats: ProfileShoppingStats;
  topCategories: ProfileCategoryStat[];
  updateInfo: MobileUpdateInfo | null;
};

export type QuickActionId = "orders" | "favorites" | "cart" | "wallet" | "recent";

export type QuickAction = {
  id: QuickActionId;
  label: string;
  icon: string;
  badge?: number;
  route: string;
};

export function formatAccountLabel(meta: StoredSessionMeta | null): { name: string; email: string } {
  if (!meta?.userId) {
    return { name: "Гость", email: "—" };
  }
  const id = meta.userId;
  if (id.includes("@")) {
    const [local] = id.split("@");
    const name = local.length > 0 ? local.charAt(0).toUpperCase() + local.slice(1) : "Пользователь";
    return { name, email: id };
  }
  return { name: "Пользователь ЛОТ", email: `ID · ${id.slice(0, 8)}…` };
}

export function deriveTopCategories(
  items: Array<{ category?: { id: string; name: string } | null }>,
): ProfileCategoryStat[] {
  const map = new Map<string, ProfileCategoryStat>();
  for (const item of items) {
    const cat = item.category;
    if (!cat?.id || !cat.name) continue;
    const prev = map.get(cat.id);
    map.set(cat.id, { id: cat.id, name: cat.name, count: (prev?.count ?? 0) + 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 4);
}
