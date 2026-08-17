import type { MobileProductListItem } from "../../api/endpoints";

export type FavoriteCollectionId = "all" | "home" | "gifts" | "want";

export type FavoriteCollection = {
  id: FavoriteCollectionId;
  title: string;
  subtitle: string;
  enabled: boolean;
};

/** Client-side collections — backend unchanged; only "all" is active in Sprint 7. */
export const FAVORITE_COLLECTIONS: FavoriteCollection[] = [
  { id: "all", title: "Все товары", subtitle: "Ваша коллекция", enabled: true },
  { id: "home", title: "Дом", subtitle: "Скоро", enabled: false },
  { id: "gifts", title: "Подарки", subtitle: "Скоро", enabled: false },
  { id: "want", title: "Хочу купить", subtitle: "Скоро", enabled: false },
];

export type FavoriteProductView = MobileProductListItem & {
  sellerName: string | null;
};

export function toFavoriteProductView(item: MobileProductListItem): FavoriteProductView {
  const seller = item.seller as { storeName?: string } | null | undefined;
  return {
    ...item,
    sellerName: typeof seller?.storeName === "string" ? seller.storeName : null,
  };
}

export function filterFavoritesByQuery(items: FavoriteProductView[], query: string): FavoriteProductView[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = [item.title, item.sellerName ?? "", item.category?.name ?? ""].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function filterByCollection(items: FavoriteProductView[], collectionId: FavoriteCollectionId): FavoriteProductView[] {
  if (collectionId === "all") return items;
  return items;
}
