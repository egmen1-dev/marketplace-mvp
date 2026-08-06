"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  clearGuestCart,
  readGuestCart,
  removeGuestItem,
  setGuestItemQuantity,
  upsertGuestItem,
  writeGuestCart,
} from "@/features/cart/lib/guest-storage";
import { buildGuestCartView } from "@/features/cart/lib/totals";
import type {
  CartMutationResult,
  CartProductSnapshot,
  CartView,
  GuestCartItem,
} from "@/features/cart/types";

type CartContextValue = {
  cart: CartView;
  isLoading: boolean;
  isPending: boolean;
  itemCount: number;
  isAuthenticated: boolean;
  addItem: (
    productId: string,
    quantity?: number,
  ) => Promise<CartMutationResult>;
  updateQuantity: (
    productId: string,
    quantity: number,
  ) => Promise<CartMutationResult>;
  removeItem: (productId: string) => Promise<CartMutationResult>;
  refresh: () => Promise<void>;
};

const emptyCart: CartView = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  currency: "RUB",
};

const CartContext = createContext<CartContextValue | null>(null);

async function fetchGuestProducts(
  items: GuestCartItem[],
): Promise<CartProductSnapshot[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.productId).join(",");
  const res = await fetch(`/api/cart/products?ids=${encodeURIComponent(ids)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items: CartProductSnapshot[] };
  return data.items ?? [];
}

async function hydrateGuestCart(): Promise<CartView> {
  const guest = readGuestCart();
  if (guest.items.length === 0) return emptyCart;
  const products = await fetchGuestProducts(guest.items);
  return buildGuestCartView(guest.items, products);
}

type CartProviderProps = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export function CartProvider({
  isAuthenticated,
  children,
}: CartProviderProps) {
  const [cart, setCart] = useState<CartView>(emptyCart);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    if (isAuthenticated) {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = (await res.json()) as CartView;
        setCart(data);
      } else {
        setCart(emptyCart);
      }
      return;
    }
    const view = await hydrateGuestCart();
    setCart(view);
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        if (isAuthenticated) {
          const guest = readGuestCart();
          if (guest.items.length > 0) {
            const mergeRes = await fetch("/api/cart/merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: guest.items }),
            });
            if (mergeRes.ok) {
              clearGuestCart();
              if (!cancelled) {
                const data = (await mergeRes.json()) as CartView;
                setCart(data);
                return;
              }
            }
          }
          if (!cancelled) await refresh();
        } else if (!cancelled) {
          await refresh();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refresh]);

  const addItem = useCallback(
    async (
      productId: string,
      quantity = 1,
    ): Promise<CartMutationResult> => {
      if (isAuthenticated) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity }),
        });
        const data = (await res.json()) as CartView & { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Не удалось добавить" };
        }
        startTransition(() => setCart(data));
        return { ok: true, cart: data };
      }

      const products = await fetchGuestProducts([{ productId, quantity }]);
      const product = products[0];
      if (!product) {
        return { ok: false, error: "Товар не найден" };
      }
      if (product.stock <= 0) {
        return { ok: false, error: "Товара нет в наличии" };
      }
      if (product.status !== "ACTIVE") {
        return { ok: false, error: "Товар недоступен для покупки" };
      }

      const guest = upsertGuestItem(
        readGuestCart(),
        productId,
        quantity,
        product.stock,
      );
      writeGuestCart(guest);
      const allProducts = await fetchGuestProducts(guest.items);
      const view = buildGuestCartView(guest.items, allProducts);
      startTransition(() => setCart(view));
      return { ok: true, cart: view };
    },
    [isAuthenticated],
  );

  const updateQuantity = useCallback(
    async (
      productId: string,
      quantity: number,
    ): Promise<CartMutationResult> => {
      if (isAuthenticated) {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity }),
        });
        const data = (await res.json()) as CartView & { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Не удалось обновить" };
        }
        startTransition(() => setCart(data));
        return { ok: true, cart: data };
      }

      const line = cart.items.find((i) => i.productId === productId);
      const stock = line?.product.stock ?? 0;
      const guest =
        quantity < 1
          ? removeGuestItem(readGuestCart(), productId)
          : setGuestItemQuantity(readGuestCart(), productId, quantity, stock);
      writeGuestCart(guest);
      const products = await fetchGuestProducts(guest.items);
      const view = buildGuestCartView(guest.items, products);
      startTransition(() => setCart(view));
      return { ok: true, cart: view };
    },
    [cart.items, isAuthenticated],
  );

  const removeItem = useCallback(
    async (productId: string): Promise<CartMutationResult> => {
      if (isAuthenticated) {
        const res = await fetch(
          `/api/cart?productId=${encodeURIComponent(productId)}`,
          { method: "DELETE" },
        );
        const data = (await res.json()) as CartView & { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Не удалось удалить" };
        }
        startTransition(() => setCart(data));
        return { ok: true, cart: data };
      }

      const guest = removeGuestItem(readGuestCart(), productId);
      writeGuestCart(guest);
      const products = await fetchGuestProducts(guest.items);
      const view = buildGuestCartView(guest.items, products);
      startTransition(() => setCart(view));
      return { ok: true, cart: view };
    },
    [isAuthenticated],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      isPending,
      itemCount: cart.itemCount,
      isAuthenticated,
      addItem,
      updateQuantity,
      removeItem,
      refresh,
    }),
    [
      cart,
      isLoading,
      isPending,
      isAuthenticated,
      addItem,
      updateQuantity,
      removeItem,
      refresh,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
