"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Minus, Plus, ShoppingBag, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import { FavoriteToggleButton } from "@/features/favorites/components/favorite-toggle-button";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProductPurchasePanelProps = {
  productId: string;
  stock: number;
  price: number;
  currency?: string;
  className?: string;
};

export function ProductPurchasePanel({
  productId,
  stock,
  price,
  currency = "RUB",
  className,
}: ProductPurchasePanelProps) {
  const router = useRouter();
  const { addItem, isPending } = useCart();
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState<"idle" | "add" | "buy">("idle");
  const [status, setStatus] = useState<"idle" | "added">("idle");
  const [stickyVisible, setStickyVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, stock);
  const busy = isPending || action !== "idle";

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { rootMargin: "-48px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function clamp(n: number) {
    return Math.min(maxQty, Math.max(1, n));
  }

  async function handleAdd() {
    if (outOfStock || busy) return;
    setAction("add");
    try {
      const result = await addItem(productId, qty);
      if (result.ok) {
        setStatus("added");
        toast.success(TOAST.CART_ADDED);
        window.setTimeout(() => setStatus("idle"), 1800);
      } else {
        toastError(result.error);
      }
    } catch {
      toastError();
    } finally {
      setAction("idle");
    }
  }

  async function handleBuy() {
    if (outOfStock || busy) return;
    setAction("buy");
    try {
      const result = await addItem(productId, qty);
      if (result.ok) {
        toast.success(TOAST.CHECKOUT_REDIRECT);
        router.push(ROUTES.CHECKOUT);
      } else {
        toastError(result.error);
      }
    } catch {
      toastError();
    } finally {
      setAction("idle");
    }
  }

  return (
    <>
      <div
        ref={panelRef}
        className={cn("flex flex-col gap-4", className)}
        data-testid="pdp-purchase"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              Количество
            </span>
            <div className="flex items-center rounded-xl bg-surface-elevated ring-1 ring-border">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                disabled={outOfStock || qty <= 1 || busy}
                onClick={() => setQty((q) => clamp(q - 1))}
                aria-label="Уменьшить"
              >
                <Minus />
              </Button>
              <span className="min-w-10 text-center font-heading text-base font-medium tabular-nums">
                {qty}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                disabled={outOfStock || qty >= maxQty || busy}
                onClick={() => setQty((q) => clamp(q + 1))}
                aria-label="Увеличить"
              >
                <Plus />
              </Button>
            </div>
          </div>

          {outOfStock ? (
            <p className="text-sm text-destructive">Нет в наличии</p>
          ) : (
            <p className="self-end pb-2 text-sm text-muted-foreground">
              В наличии: {stock} шт.
            </p>
          )}

          <div className="ml-auto self-end pb-1">
            <FavoriteToggleButton
              productId={productId}
              className="size-10 rounded-xl bg-surface-elevated shadow-none ring-1 ring-border"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
          <Button
            type="button"
            size="cta"
            className="flex-1"
            disabled={outOfStock || busy}
            aria-busy={action === "buy"}
            data-testid="pdp-buy"
            onClick={() => void handleBuy()}
          >
            {action === "buy" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Добавляем…
              </>
            ) : (
              <>
                <Zap data-icon="inline-start" />
                Купить
              </>
            )}
          </Button>
          <Button
            type="button"
            size="cta"
            variant="secondary"
            className="flex-1"
            disabled={outOfStock || busy}
            aria-busy={action === "add"}
            data-testid="pdp-add-cart"
            onClick={() => void handleAdd()}
          >
            {action === "add" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Добавляем…
              </>
            ) : status === "added" ? (
              <>
                <Check data-icon="inline-start" />
                Добавлено
              </>
            ) : (
              <>
                <ShoppingBag data-icon="inline-start" />
                В корзину
              </>
            )}
          </Button>
        </div>

        <Button
          variant="link"
          size="sm"
          className="h-auto w-fit px-0 text-muted-foreground"
          nativeButton={false}
          render={<Link href="#similar" />}
        >
          Смотреть похожие товары
        </Button>
      </div>

      {/* Mobile sticky purchase — only when main panel is off-screen */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-md transition-transform duration-200 md:hidden",
          stickyVisible && !outOfStock
            ? "translate-y-0"
            : "pointer-events-none translate-y-full",
        )}
        data-testid="pdp-sticky-purchase"
        aria-hidden={!stickyVisible || outOfStock}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <p className="min-w-0 flex-1 truncate font-heading text-lg font-semibold text-primary">
            {formatPrice(price, currency)}
          </p>
          <Button
            type="button"
            size="cta"
            variant="secondary"
            className="min-w-[7.5rem] shrink-0"
            disabled={busy}
            onClick={() => void handleAdd()}
          >
            {status === "added" ? "Добавлено" : "В корзину"}
          </Button>
          <Button
            type="button"
            size="cta"
            className="min-w-[6.5rem] shrink-0"
            disabled={busy}
            data-testid="pdp-sticky-buy"
            onClick={() => void handleBuy()}
          >
            Купить
          </Button>
        </div>
      </div>
    </>
  );
}
