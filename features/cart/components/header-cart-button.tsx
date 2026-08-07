"use client";

import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";

import { headerActionClassName } from "@/components/layout/header-action";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import { ROUTES } from "@/lib/constants";
import { pluralizeProductCount } from "@/lib/i18n";
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
      size="icon-header"
      className={headerActionClassName("relative", className)}
      title="Корзина"
      nativeButton={false}
      render={
        <Link
          href={ROUTES.CART}
          aria-label={
            isLoading
              ? "Корзина, загрузка"
              : showBadge
                ? `Корзина, ${pluralizeProductCount(itemCount)}`
                : "Корзина"
          }
        />
      }
    >
      {isLoading ? (
        <Loader2 className="size-[1.375rem] animate-spin" aria-hidden />
      ) : (
        <ShoppingBag aria-hidden />
      )}
      {showBadge ? (
        <span
          className={cn(
            "absolute top-1 right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground shadow-sm ring-2 ring-background",
          )}
          aria-hidden
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Button>
  );
}
