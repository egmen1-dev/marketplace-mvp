"use client";

import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type HeaderCartButtonProps = {
  className?: string;
};

export function HeaderCartButton({ className }: HeaderCartButtonProps) {
  const { itemCount, isLoading } = useCart();
  const showBadge = !isLoading && itemCount > 0;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("relative text-muted-foreground", className)}
      nativeButton={false}
      render={
        <Link
          href={ROUTES.CART}
          aria-label={
            isLoading
              ? "Корзина, загрузка"
              : showBadge
                ? `Корзина, ${itemCount} товаров`
                : "Корзина"
          }
        />
      }
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <ShoppingBag />
      )}
      {showBadge ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Button>
  );
}
