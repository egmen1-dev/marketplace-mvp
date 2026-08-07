"use client";

import { useState } from "react";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import { TOAST, toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";

type AddToCartButtonProps = {
  productId: string;
  stock: number;
  quantity?: number;
  size?: "default" | "sm" | "lg" | "cta" | "cta-card";
  variant?: "default" | "secondary" | "outline";
  className?: string;
  label?: string;
};

export function AddToCartButton({
  productId,
  stock,
  quantity = 1,
  size = "cta-card",
  variant = "default",
  className,
  label = "В корзину",
}: AddToCartButtonProps) {
  const { addItem, isPending } = useCart();
  const [localPending, setLocalPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const outOfStock = stock <= 0;
  const busy = isPending || localPending;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || busy) return;

    setLocalPending(true);
    try {
      const result = await addItem(productId, quantity);
      if (result.ok) {
        setStatus("added");
        toast.success(TOAST.CART_ADDED);
        window.setTimeout(() => setStatus("idle"), 1800);
      } else {
        setStatus("error");
        toastError(result.error);
        window.setTimeout(() => setStatus("idle"), 2500);
      }
    } catch {
      toastError();
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2500);
    } finally {
      setLocalPending(false);
    }
  }

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <Button
        type="button"
        size={size}
        variant={variant}
        className="w-full"
        disabled={outOfStock || busy}
        aria-busy={busy}
        onClick={(e) => void handleClick(e)}
      >
        {localPending ? (
          <>
            <Loader2 data-icon="inline-start" className="animate-spin" />
            Добавляем…
          </>
        ) : status === "added" ? (
          <>
            <Check data-icon="inline-start" />
            Добавлено
          </>
        ) : outOfStock ? (
          "Нет в наличии"
        ) : (
          <>
            <ShoppingBag data-icon="inline-start" />
            {label}
          </>
        )}
      </Button>
    </div>
  );
}
