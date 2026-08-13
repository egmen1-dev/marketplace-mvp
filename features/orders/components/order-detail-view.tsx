import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BuyerOrderActions } from "@/features/order-lifecycle/components/buyer-order-actions";
import { OrderTimeline } from "@/features/order-lifecycle/components/order-timeline";
import { OrderItemRow } from "@/features/orders/components/order-item-row";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { PayOrderButton } from "@/features/orders/components/pay-order-button";
import { PaymentProcessingRefresh } from "@/features/orders/components/payment-processing-refresh";
import { formatOrderDate } from "@/features/orders/lib/status";
import type { OrderDetail } from "@/features/orders/types";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";

type OrderDetailViewProps = {
  order: OrderDetail;
  paymentSuccess?: boolean;
};

export function OrderDetailView({
  order,
  paymentSuccess = false,
}: OrderDetailViewProps) {
  const canPay = order.status === "NEW";
  const isPaid =
    order.status !== "NEW" &&
    order.status !== "CANCELLED" &&
    order.status !== "REJECTED";
  const showProcessing = paymentSuccess && order.status === "NEW";

  return (
    <div className="flex flex-col gap-8">
      <PaymentProcessingRefresh active={showProcessing} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={ROUTES.ORDERS}
              className="transition-colors hover:text-foreground"
            >
              ← Все заказы
            </Link>
          </p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Заказ {order.orderNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.isOverdue ? (
              <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                Просрочен
              </span>
            ) : null}
            <span className="text-sm text-muted-foreground">
              {formatOrderDate(order.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.fulfillmentType === "SELLER_PICKUP"
              ? "Самовывоз у продавца"
              : "Доставка"}
            {order.estimatedDeliveryAt
              ? ` · ориентир к ${formatOrderDate(order.estimatedDeliveryAt)}`
              : null}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          В каталог
        </Button>
      </div>

      <BuyerOrderActions orderId={order.id} status={order.status} />

      {isPaid && paymentSuccess ? (
        <p
          className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm text-foreground"
          data-testid="payment-success-banner"
        >
          Оплата прошла успешно. Спасибо за покупку!
        </p>
      ) : null}

      {showProcessing ? (
        <p className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
          Платёж обрабатывается. Статус обновится автоматически после
          подтверждения Stripe — обновите страницу через несколько секунд.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <div className="rounded-2xl border border-border bg-surface/40 px-4 sm:px-6">
            {order.items.map((item) => (
              <OrderItemRow
                key={item.id}
                item={item}
                currency={order.currency}
              />
            ))}
          </div>

          <section className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-6">
            <h2 className="font-heading text-lg font-medium">История заказа</h2>
            <div className="mt-4">
              <OrderTimeline
                entries={order.history}
                expectedNextAction={order.expectedNextAction}
              />
            </div>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-5 rounded-2xl border border-border bg-surface/60 p-5 lg:sticky lg:top-24">
          <div>
            <h2 className="font-heading text-lg font-medium">Итого</h2>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Товары</span>
                <span>{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Доставка</span>
                <span>
                  {order.shippingCost > 0
                    ? formatPrice(order.shippingCost, order.currency)
                    : "Бесплатно"}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-heading text-base font-medium text-foreground">
                <span>{isPaid ? "Оплачено" : "К оплате"}</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {order.shipping ? (
            <div>
              <h3 className="text-sm font-medium">Получение</h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {order.delivery ? (
                  <p>
                    {order.fulfillmentType === "SELLER_PICKUP"
                      ? "Самовывоз"
                      : order.delivery.method === "PICKUP"
                        ? "СДЭК — пункт выдачи"
                        : "СДЭК — курьер"}
                    {order.delivery.estimatedMinDays != null &&
                    order.delivery.estimatedMaxDays != null
                      ? ` · ${order.delivery.estimatedMinDays}–${order.delivery.estimatedMaxDays} дн.`
                      : null}
                  </p>
                ) : null}
                <p>{order.shipping.fullName}</p>
                {order.shipping.phone ? <p>{order.shipping.phone}</p> : null}
                {order.delivery?.pickupAddress ? (
                  <p>{order.delivery.pickupAddress}</p>
                ) : (
                  <p>
                    {order.shipping.city}, {order.shipping.street}
                  </p>
                )}
                {order.delivery?.trackingNumber ? (
                  <p>Трек: {order.delivery.trackingNumber}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {order.notes ? (
            <div>
              <h3 className="text-sm font-medium">Комментарий</h3>
              <p className="mt-2 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          ) : null}

          {canPay ? <PayOrderButton orderId={order.id} /> : null}

          {canPay ? (
            <p className="text-xs text-muted-foreground">
              Оплата через Stripe Checkout. После успешной оплаты заказ ожидает
              подтверждения продавца.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
