"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartItemRow } from "@/features/cart/components/cart-item-row";
import { useCart } from "@/features/cart/components/cart-provider";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { pluralizeProductWord } from "@/lib/i18n";

export function CartPageView() {
  const { cart, isLoading, itemCount } = useCart();
  const isEmpty = !isLoading && cart.items.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Корзина
        </h1>
        {!isLoading && itemCount > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {itemCount} {pluralizeProductWord(itemCount)}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div
          className="space-y-4 rounded-2xl border border-border bg-surface/40 px-4 py-6 sm:px-6"
          aria-busy
          aria-label="Загрузка корзины"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-border/60 py-4 last:border-0">
              <div className="size-20 shrink-0 animate-pulse rounded-xl bg-muted/70 sm:size-24" />
              <div className="flex flex-1 flex-col gap-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted/70" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted/50" />
                <div className="mt-auto h-8 w-28 animate-pulse rounded-lg bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <ShoppingBag className="size-10 text-muted-foreground" />
          <div>
            <p className="font-heading text-lg font-medium">Корзина пуста</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Добавьте товары из каталога, чтобы оформить заказ.
            </p>
          </div>
          <Button
            size="cta"
            className="w-full"
            nativeButton={false}
            render={<Link href={ROUTES.CATALOG} />}
          >
            Перейти в каталог
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-border bg-surface/40 px-4 sm:px-6">
            {cart.items.map((item) => (
              <CartItemRow key={item.productId} item={item} />
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-surface/60 p-5 lg:sticky lg:top-24">
            <h2 className="font-heading text-lg font-medium">Итого</h2>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Товары</span>
                <span>{formatPrice(cart.subtotal, cart.currency)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-heading text-base font-medium text-foreground">
                <span>Итого</span>
                <span>{formatPrice(cart.subtotal, cart.currency)}</span>
              </div>
            </div>

            <Button
              size="cta"
              className="mt-6 w-full"
              disabled={cart.items.length === 0}
              nativeButton={false}
              render={<Link href={ROUTES.CHECKOUT} />}
            >
              Оформить заказ
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Далее — данные доставки и подтверждение
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
