import { useCallback } from "react";

import { useCartStore } from "../commerce/cart-store";
import { useCommerceActions } from "./useCommerceActions";

/** Per-card commerce wiring — reads aggregated cart store, no per-card fetch. */
export function useProductCardCommerce(productId: string) {
  const quantity = useCartStore((s) => s.quantities[productId] ?? 0);
  const busy = useCartStore((s) => Boolean(s.pending[productId]));
  const { addProductToCart, incrementProductCart, decrementProductCart } = useCommerceActions();

  const onAdd = useCallback(() => {
    void addProductToCart(productId, 1);
  }, [addProductToCart, productId]);

  const onIncrement = useCallback(() => {
    void incrementProductCart(productId);
  }, [incrementProductCart, productId]);

  const onDecrement = useCallback(() => {
    void decrementProductCart(productId);
  }, [decrementProductCart, productId]);

  return { quantity, busy, onAdd, onIncrement, onDecrement };
}
