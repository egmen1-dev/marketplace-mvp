export type CategoryRailItem = {
  id: string;
  name: string;
  catalogProductCount?: number;
  productCount?: number;
  level?: number;
};

/** Categories eligible for Home/Catalog chip rail — no N+1 (uses API counts). */
export function selectRailCategories<T extends CategoryRailItem>(items: T[]): T[] {
  return items.filter((item) => {
    const count = item.catalogProductCount ?? item.productCount ?? 0;
    return count > 0;
  });
}
