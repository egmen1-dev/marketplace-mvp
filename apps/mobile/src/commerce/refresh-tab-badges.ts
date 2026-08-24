import { fetchBuyerHome, fetchCart, fetchConversationsUnread, fetchFavorites } from "../api/endpoints";
import { useCartQuantitiesStore } from "./cart-quantities-store";
import { useAppStore } from "../store/app-store";

/** Refresh cart/favorites/orders tab badges after a commerce mutation. */
export async function refreshTabBadges(): Promise<void> {
  const { setBadges, mode } = useAppStore.getState();
  try {
    const [cart, favorites, home, unread] = await Promise.all([
      fetchCart().catch(() => null),
      fetchFavorites().catch(() => null),
      mode === "buyer" ? fetchBuyerHome().catch(() => null) : Promise.resolve(null),
      fetchConversationsUnread().catch(() => null),
    ]);
    const cartItems = (cart?.items as Array<{ productId: string; quantity: number }> | undefined) ?? [];
    useCartQuantitiesStore.getState().applyCartItems(cartItems);
    setBadges({
      cart: cartItems.length,
      favorites: favorites?.items?.length ?? 0,
      orders: (home as { orders?: { active: number } } | null)?.orders?.active ?? 0,
      messages: unread?.unreadTotal ?? 0,
    });
  } catch {
    // badges are best-effort
  }
}
