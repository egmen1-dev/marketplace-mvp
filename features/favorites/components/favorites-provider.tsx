"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  getFavoriteIdsAction,
  toggleFavoriteAction,
} from "@/features/favorites/actions";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";

type FavoritesContextValue = {
  ids: Set<string>;
  ready: boolean;
  isAuthenticated: boolean;
  isPending: boolean;
  pendingId: string | null;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type FavoritesProviderProps = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export function FavoritesProvider({
  isAuthenticated,
  children,
}: FavoritesProviderProps) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isAuthenticated) {
        if (!cancelled) {
          setIds(new Set());
          setReady(true);
        }
        return;
      }
      try {
        const list = await getFavoriteIdsAction();
        if (!cancelled) setIds(new Set(list));
      } catch {
        if (!cancelled) setIds(new Set());
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        toast.message(TOAST.FAVORITE_AUTH);
        router.push(
          `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.FAVORITES)}`,
        );
        return;
      }

      if (pendingId) return;

      const wasFavorite = ids.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(productId);
        else next.add(productId);
        return next;
      });
      setPendingId(productId);

      try {
        const result = await toggleFavoriteAction(productId);
        if (!result.ok) {
          setIds((prev) => {
            const next = new Set(prev);
            if (wasFavorite) next.add(productId);
            else next.delete(productId);
            return next;
          });
          if (result.code === "AUTH_REQUIRED") {
            toastError("Требуется вход");
            router.push(
              `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.FAVORITES)}`,
            );
          } else {
            toastError(result.error);
          }
          return;
        }
        setIds((prev) => {
          const next = new Set(prev);
          if (result.isFavorite) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.success(
          result.isFavorite ? TOAST.FAVORITE_ADDED : TOAST.FAVORITE_REMOVED,
        );
        router.refresh();
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toastError();
      } finally {
        setPendingId(null);
      }
    },
    [ids, isAuthenticated, pendingId, router],
  );

  const isFavorite = useCallback(
    (productId: string) => ready && ids.has(productId),
    [ids, ready],
  );

  const value = useMemo(
    () => ({
      ids,
      ready,
      isAuthenticated,
      isPending: pendingId !== null,
      pendingId,
      isFavorite,
      toggle,
    }),
    [ids, ready, isAuthenticated, pendingId, isFavorite, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}

export function useFavorite(productId: string) {
  const { isFavorite, toggle, ready, pendingId } = useFavorites();
  return {
    isFavorite: isFavorite(productId),
    toggle: () => toggle(productId),
    ready,
    isPending: pendingId === productId,
  };
}
