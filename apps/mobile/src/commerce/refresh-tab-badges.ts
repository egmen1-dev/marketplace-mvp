import { fetchBuyerHome, fetchCart, fetchFavorites } from "../api/endpoints";
import { useAppStore } from "../store/app-store";

/** Refresh cart/favorites/orders tab badges after a commerce mutation. */
export async function refreshTabBadges(): Promise<void> {
  const { setBadges, mode } = useAppStore.getState();
  try {
    const [cart, favorites, home] = await Promise.all([
      fetchCart().catch(() => null),
      fetchFavorites().catch(() => null),
      mode === "buyer" ? fetchBuyerHome().catch(() => null) : Promise.resolve(null),
    ]);
    const cartItems = (cart?.items as unknown[] | undefined) ?? [];
    setBadges({
      cart: cartItems.length,
      favorites: favorites?.items?.length ?? 0,
      orders: (home as { orders?: { active: number } } | null)?.orders?.active ?? 0,
    });
  } catch {
    // badges are best-effort
  }
}
