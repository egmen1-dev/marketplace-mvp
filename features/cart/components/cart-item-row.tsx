"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";
import { QtyStepper } from "@/features/cart/components/qty-stepper";
import type { CartLineItem } from "@/features/cart/types";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { TOAST, toastError } from "@/lib/toasts";

type CartItemRowProps = {
  item: CartLineItem;
};

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem, isPending } = useCart();
  const { product } = item;
  const href = `${ROUTES.PRODUCT}/${product.id}`;
  const maxQty = Math.max(1, product.stock);
  const outOfStock = product.stock <= 0;

  return (
    <article className="flex gap-4 border-b border-border/80 py-5 last:border-0">
      <Link
        href={href}
        className="relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24"
      >
        <ProductImage
          src={product.primaryImage?.url}
          alt={product.primaryImage?.alt ?? product.title}
          sizes="96px"
          containerClassName="absolute inset-0"
          fallbackLabel={false}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={href}
              className="font-heading text-sm font-medium leading-snug transition-colors hover:text-primary sm:text-base"
            >
              {product.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPrice(product.price, product.currency)}
            </p>
            {outOfStock ? (
              <p className="mt-1 text-xs text-destructive">Нет в наличии</p>
            ) : product.stock < item.quantity ? (
              <p className="mt-1 text-xs text-destructive">
                Доступно только {product.stock} шт.
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            aria-label="Удалить из корзины"
            disabled={isPending}
            onClick={() => {
              void (async () => {
                const result = await removeItem(item.productId);
                if (result.ok) toast.success(TOAST.CART_REMOVED);
                else toastError(result.error);
              })();
            }}
          >
            <Trash2 />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <QtyStepper
            value={item.quantity}
            max={maxQty}
            disabled={isPending || outOfStock}
            onChange={(next) => void updateQuantity(item.productId, next)}
          />
          <p className="font-heading text-sm font-medium sm:text-base">
            {formatPrice(item.lineTotal, product.currency)}
          </p>
        </div>
      </div>
    </article>
  );
}
