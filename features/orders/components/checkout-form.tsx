"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/features/cart/components/cart-provider";
import type { CartView } from "@/features/cart/types";
import {
  createOrderFromCartAction,
  type CreateOrderActionState,
} from "@/features/orders/actions";
import { DeliverySection } from "@/features/orders/components/delivery-section";
import { formatPrice } from "@/features/products/mappers";
import type { DeliveryQuote } from "@/lib/delivery/types";
import { ROUTES } from "@/lib/constants";

const initialState: CreateOrderActionState = { ok: false };

type CheckoutFormProps = {
  initialCart: CartView;
  defaultName: string;
  defaultPhone: string;
  canceled?: boolean;
};

export function CheckoutForm({
  initialCart,
  defaultName,
  defaultPhone,
  canceled = false,
}: CheckoutFormProps) {
  const router = useRouter();
  const { refresh } = useCart();
  const [state, formAction, pending] = useActionState(
    createOrderFromCartAction,
    initialState,
  );
  const [cart, setCart] = useState(initialCart);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(
    null,
  );
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "COURIER">(
    "PICKUP",
  );

  useEffect(() => {
    setCart(initialCart);
  }, [initialCart]);

  useEffect(() => {
    if (!state.ok) return;
    void (async () => {
      await refresh();
      if (state.checkoutUrl) {
        window.location.href = state.checkoutUrl;
        return;
      }
      router.push(`${ROUTES.ORDERS}/${state.orderId}`);
    })();
  }, [state, refresh, router]);

  const isEmpty = cart.items.length === 0;
  const failedOrderId =
    !state.ok && "orderId" in state ? state.orderId : undefined;
  const shippingCost = deliveryQuote?.cost ?? 0;
  const orderTotal = cart.subtotal + shippingCost;
  const canPay = Boolean(deliveryQuote) && !pending && !isEmpty;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <div>
          <p className="font-heading text-lg font-medium">Корзина пуста</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Добавьте товары, чтобы оформить заказ.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={ROUTES.CATALOG} />}
          >
            В каталог
          </Button>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href={ROUTES.CART} />}
          >
            Корзина
          </Button>
        </div>
      </div>
    );
  }

  const fieldErrors =
    !state.ok && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form
      action={formAction}
      className="grid gap-8 lg:grid-cols-[1fr_340px]"
    >
      <div className="flex flex-col gap-6">
        {canceled ? (
          <p className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
            Оплата отменена. Вы можете изменить данные и попробовать снова.
          </p>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
          <h2 className="font-heading text-lg font-medium">Получатель</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Контакты для связи по заказу.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="fullName">Имя получателя</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                defaultValue={defaultName}
                placeholder="Иван Иванов"
                aria-invalid={Boolean(fieldErrors?.fullName)}
                disabled={pending}
              />
              {fieldErrors?.fullName?.[0] ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.fullName[0]}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={defaultPhone}
                placeholder="+7 900 000-00-00"
                aria-invalid={Boolean(fieldErrors?.phone)}
                disabled={pending}
              />
              {fieldErrors?.phone?.[0] ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.phone[0]}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <DeliverySection
          disabled={pending}
          currency={cart.currency}
          fieldErrors={fieldErrors}
          onMethodChange={setDeliveryMethod}
          onQuoteChange={setDeliveryQuote}
        />

        {deliveryMethod === "COURIER" ? (
          <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
            <h2 className="font-heading text-lg font-medium">Адрес курьера</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Улица, дом и квартира для доставки.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Label htmlFor="street">Адрес</Label>
              <Input
                id="street"
                name="street"
                required
                placeholder="ул. Примерная, д. 1, кв. 2"
                aria-invalid={Boolean(fieldErrors?.street)}
                disabled={pending}
              />
              {fieldErrors?.street?.[0] ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.street[0]}
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <input type="hidden" name="street" value="" />
        )}

        <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Комментарий к заказу</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Код домофона, удобное время…"
              className="rounded-xl bg-surface"
              disabled={pending}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface/40 px-4 sm:px-6">
          <h2 className="px-1 pt-5 font-heading text-lg font-medium sm:pt-6">
            Товары
          </h2>
          {cart.items.map((item) => (
            <article
              key={item.productId}
              className="flex gap-4 border-b border-border/80 py-5 last:border-0"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-elevated sm:size-20">
                {item.product.primaryImage ? (
                  <Image
                    src={item.product.primaryImage.url}
                    alt={
                      item.product.primaryImage.alt ?? item.product.title
                    }
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-surface"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <p className="font-heading text-sm font-medium leading-snug">
                  {item.product.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.product.price, item.product.currency)} ×{" "}
                  {item.quantity}
                </p>
              </div>
              <p className="self-center font-heading text-sm font-medium">
                {formatPrice(item.lineTotal, item.product.currency)}
              </p>
            </article>
          ))}
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-surface/60 p-5 lg:sticky lg:top-24">
        <h2 className="font-heading text-lg font-medium">Итого</h2>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Товары</span>
            <span>{formatPrice(cart.subtotal, cart.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Доставка</span>
            <span>
              {deliveryQuote
                ? formatPrice(shippingCost, cart.currency)
                : "—"}
            </span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between font-heading text-base font-medium text-foreground">
            <span>К оплате</span>
            <span>{formatPrice(orderTotal, cart.currency)}</span>
          </div>
        </div>

        {!state.ok && state.error ? (
          <div className="mt-4 space-y-2">
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
            {failedOrderId ? (
              <p className="text-xs text-muted-foreground">
                Заказ создан.{" "}
                <Link
                  href={`${ROUTES.ORDERS}/${failedOrderId}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Открыть заказ и оплатить
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full"
          disabled={!canPay}
        >
          {pending ? "Переходим к оплате…" : "Оплатить"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Безопасная оплата через Stripe. Доставка СДЭК включена в сумму.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-muted-foreground"
          nativeButton={false}
          render={<Link href={ROUTES.CART} />}
        >
          Вернуться в корзину
        </Button>
      </aside>
    </form>
  );
}
