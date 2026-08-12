"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/features/cart/components/cart-provider";
import { computeCartPackageSummary } from "@/features/cart/lib/package-summary";
import type { CartView } from "@/features/cart/types";
import {
  createOrderFromCartAction,
  type CreateOrderActionState,
} from "@/features/orders/actions";
import { DeliverySection } from "@/features/orders/components/delivery-section";
import { calcPrepaymentAmount } from "@/features/pickup/lib/prepayment";
import type { PickupPointDto } from "@/features/pickup/queries";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import type { DeliveryQuote } from "@/lib/delivery/types";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const initialState: CreateOrderActionState = { ok: false };

export type CheckoutPickupOption = {
  point: PickupPointDto;
  /** Estimated charge now (prepayment sum) */
  prepaymentTotal: number;
  remainingTotal: number;
};

type CheckoutFormProps = {
  initialCart: CartView;
  defaultName: string;
  defaultPhone: string;
  canceled?: boolean;
  sellerPickupOptions?: CheckoutPickupOption[];
  sellerPickupAvailable?: boolean;
  /** Prefer seller pickup when opened from PDP «Забронировать». */
  preferSellerPickup?: boolean;
};

export function CheckoutForm({
  initialCart,
  defaultName,
  defaultPhone,
  canceled = false,
  sellerPickupOptions = [],
  sellerPickupAvailable = false,
  preferSellerPickup = false,
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
  // SSR + first client paint must share the same fulfillment tree.
  // Preferring pickup only after mount caused intermittent #418 when the
  // DeliverySection ↔ pickup-points swap raced hydration (esp. ?fulfillment=).
  const [fulfillmentType, setFulfillmentType] = useState<
    "DELIVERY" | "SELLER_PICKUP"
  >(() =>
    preferSellerPickup && sellerPickupAvailable
      ? "SELLER_PICKUP"
      : "DELIVERY",
  );
  const [sellerPointId, setSellerPointId] = useState(
    sellerPickupOptions[0]?.point.id ?? "",
  );
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);

  useEffect(() => {
    setCart(initialCart);
  }, [initialCart]);

  useEffect(() => {
    setFullName(defaultName);
    setPhone(defaultPhone);
  }, [defaultName, defaultPhone]);

  useEffect(() => {
    if (!sellerPointId && sellerPickupOptions[0]?.point.id) {
      setSellerPointId(sellerPickupOptions[0].point.id);
    }
  }, [sellerPickupOptions, sellerPointId]);

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

  const selectedPickup = useMemo(
    () => sellerPickupOptions.find((o) => o.point.id === sellerPointId) ?? null,
    [sellerPickupOptions, sellerPointId],
  );
  const packageSummary = useMemo(
    () => computeCartPackageSummary(cart),
    [cart],
  );

  const isEmpty = cart.items.length === 0;
  const failedOrderId =
    !state.ok && "orderId" in state ? state.orderId : undefined;
  const shippingCost =
    fulfillmentType === "SELLER_PICKUP" ? 0 : (deliveryQuote?.cost ?? 0);
  const goodsCharge =
    fulfillmentType === "SELLER_PICKUP" && selectedPickup
      ? selectedPickup.prepaymentTotal
      : cart.subtotal;
  const orderTotal = goodsCharge + shippingCost;
  const canPay =
    fulfillmentType === "SELLER_PICKUP"
      ? Boolean(sellerPointId) && !pending && !isEmpty
      : Boolean(deliveryQuote) && !pending && !isEmpty;

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
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          В каталог
        </Button>
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
      <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
      <input type="hidden" name="sellerPickupPointId" value={sellerPointId} />

      <div className="flex flex-col gap-6">
        {canceled ? (
          <p className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
            Оплата отменена. Вы можете изменить данные и попробовать снова.
          </p>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
          <h2 className="font-heading text-lg font-medium">Получатель</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="fullName">Имя получателя</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="Иван Иванов"
                disabled={pending}
                // Browser autofill can rewrite values before hydrate → #418
                suppressHydrationWarning
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+7 900 000-00-00"
                disabled={pending}
                suppressHydrationWarning
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
          <h2 className="font-heading text-lg font-medium">Способ получения</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              data-testid="checkout-fulfillment-delivery"
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 text-left text-sm font-medium",
                fulfillmentType === "DELIVERY"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground",
              )}
              onClick={() => setFulfillmentType("DELIVERY")}
            >
              Доставка
            </button>
            <button
              type="button"
              disabled={!sellerPickupAvailable}
              data-testid="checkout-fulfillment-pickup"
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 text-left text-sm font-medium",
                fulfillmentType === "SELLER_PICKUP"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground",
                !sellerPickupAvailable && "cursor-not-allowed opacity-50",
              )}
              onClick={() => {
                if (sellerPickupAvailable) setFulfillmentType("SELLER_PICKUP");
              }}
            >
              Самовывоз
              {!sellerPickupAvailable ? (
                <span className="mt-1 block text-xs font-normal">
                  Недоступен для этой корзины
                </span>
              ) : null}
            </button>
          </div>
        </section>

        {fulfillmentType === "DELIVERY" ? (
          <>
            <DeliverySection
              disabled={pending}
              currency={cart.currency}
              fieldErrors={fieldErrors}
              onMethodChange={setDeliveryMethod}
              onQuoteChange={setDeliveryQuote}
              packageSummary={packageSummary}
            />
            {deliveryMethod === "COURIER" ? (
              <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
                <Label htmlFor="street">Адрес</Label>
                <Input
                  id="street"
                  name="street"
                  required
                  className="mt-2"
                  placeholder="ул. Примерная, д. 1, кв. 2"
                  disabled={pending}
                />
              </section>
            ) : (
              <input type="hidden" name="street" value="" />
            )}
          </>
        ) : (
          <section
            className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6"
            data-testid="checkout-pickup-points"
          >
            <h2 className="font-heading text-lg font-medium">
              Точка самовывоза
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {sellerPickupOptions.map((opt) => {
                const active = opt.point.id === sellerPointId;
                return (
                  <li key={opt.point.id}>
                    <button
                      type="button"
                      data-testid="checkout-pickup-point"
                      onClick={() => setSellerPointId(opt.point.id)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left text-sm",
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <span className="font-medium">{opt.point.name}</span>
                      <span className="mt-1 block text-muted-foreground">
                        {opt.point.city}, {opt.point.address}
                      </span>
                      {opt.point.workingHours ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {opt.point.workingHours}
                        </span>
                      ) : null}
                      <span
                        className="mt-2 block text-xs"
                        data-testid="checkout-pickup-amounts"
                      >
                        Предоплата{" "}
                        {formatPrice(opt.prepaymentTotal, cart.currency)} ·
                        остаток{" "}
                        {formatPrice(opt.remainingTotal, cart.currency)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedPickup && selectedPickup.remainingTotal > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Вы оплачиваете бронь. Остаток оплачивается продавцу при
                получении.
              </p>
            ) : null}
            <input type="hidden" name="city" value={selectedPickup?.point.city ?? ""} />
            <input type="hidden" name="street" value="" />
            <input type="hidden" name="deliveryMethod" value="PICKUP" />
          </section>
        )}

        {fulfillmentType === "DELIVERY" ? null : null}

        <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
          <Label htmlFor="notes">Комментарий к заказу</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            className="mt-2 rounded-xl bg-surface"
            disabled={pending}
          />
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
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
                <ProductImage
                  src={item.product.primaryImage?.url}
                  alt={item.product.primaryImage?.alt ?? item.product.title}
                  sizes="80px"
                  containerClassName="absolute inset-0"
                  fallbackLabel={false}
                />
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
            <span>
              {fulfillmentType === "SELLER_PICKUP" ? "Предоплата" : "Товары"}
            </span>
            <span>{formatPrice(goodsCharge, cart.currency)}</span>
          </div>
          {fulfillmentType === "DELIVERY" ? (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Доставка</span>
              <span>
                {deliveryQuote
                  ? formatPrice(shippingCost, cart.currency)
                  : "—"}
              </span>
            </div>
          ) : selectedPickup && selectedPickup.remainingTotal > 0 ? (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Остаток при получении</span>
              <span>
                {formatPrice(selectedPickup.remainingTotal, cart.currency)}
              </span>
            </div>
          ) : null}
          <Separator className="my-2" />
          <div
            className="flex items-center justify-between font-heading text-base font-medium text-foreground"
            data-testid="checkout-pay-now"
          >
            <span>К оплате сейчас</span>
            <span>{formatPrice(orderTotal, cart.currency)}</span>
          </div>
        </div>

        {!state.ok && state.error ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {failedOrderId ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <Link
              href={`${ROUTES.ORDERS}/${failedOrderId}`}
              className="underline underline-offset-2"
            >
              Открыть заказ
            </Link>
          </p>
        ) : null}

        <Button
          type="submit"
          size="cta"
          className="mt-6 w-full"
          disabled={!canPay}
        >
          {pending
            ? "Оформляем…"
            : fulfillmentType === "SELLER_PICKUP"
              ? "Забронировать"
              : "Оплатить"}
        </Button>
      </aside>
    </form>
  );
}

/** Helper for server checkout page — compute pickup options from cart product ids. */
export { calcPrepaymentAmount };
