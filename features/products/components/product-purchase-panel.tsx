"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import { FavoriteToggleButton } from "@/features/favorites/components/favorite-toggle-button";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProductPurchasePanelProps = {
  productId: string;
  stock: number;
  className?: string;
};

export function ProductPurchasePanel({
  productId,
  stock,
  className,
}: ProductPurchasePanelProps) {
  const router = useRouter();
  const { addItem, isPending } = useCart();
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState<"idle" | "add" | "buy">("idle");
  const [status, setStatus] = useState<"idle" | "added">("idle");
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, stock);
  const busy = isPending || action !== "idle";

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
    <div className={cn("flex flex-col gap-4", className)}>
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

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="h-12 flex-1 rounded-xl text-base"
          disabled={outOfStock || busy}
          aria-busy={action === "buy"}
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
          size="lg"
          variant="secondary"
          className="h-12 flex-1 rounded-xl text-base"
          disabled={outOfStock || busy}
          aria-busy={action === "add"}
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
  );
}
