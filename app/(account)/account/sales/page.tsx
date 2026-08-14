import Link from "next/link";
import { Suspense } from "react";
import { UserRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatOrderDate,
  formatOrderStatus,
  OrderStatusBadge,
} from "@/features/orders";
import { formatPrice } from "@/features/products/mappers";
import { OrderFulfillmentSteps } from "@/features/seller/components/order-fulfillment-steps";
import { SellerOrderStatusActions } from "@/features/seller/components/seller-order-status-actions";
import { SellerToastFlash } from "@/features/seller/components/seller-toast-flash";
import { SellerFirstEntryBannerSlot } from "@/features/seller-first-entry";
import { SellerJourneyEmptyState } from "@/features/seller-journey";
import {
  getSellerOrderCounters,
  listSellerOrders,
} from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";
import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery";
import { getSellerJourneyEmptyState } from "@/lib/seller-journey";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Заказы",
};

const BUCKET_TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "NEW", label: "Новые" },
  { value: "AWAITING_CONFIRMATION", label: "Требуют подтверждения" },
  { value: "PROCESSING", label: "Комплектуются" },
  { value: "READY", label: "Готовы" },
  { value: "SHIPPED", label: "Отправлены" },
  { value: "PROBLEM", label: "Проблемные" },
  { value: "CANCELLED", label: "Отменённые" },
  { value: "COMPLETED", label: "Завершённые" },
  { value: "OVERDUE", label: "Просрочено" },
];

type PageProps = {
  searchParams: Promise<{ bucket?: string; from?: string; to?: string }>;
};

export default async function SellerOrdersPage({ searchParams }: PageProps) {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_SALES);
  const params = await searchParams;

  const bucketRaw = params.bucket?.toUpperCase() ?? "ALL";
  const bucket = BUCKET_TABS.some((t) => t.value === bucketRaw)
    ? bucketRaw
    : "ALL";

  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  let orders: Awaited<ReturnType<typeof listSellerOrders>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };
  let counters = {
    newCount: 0,
    inProgress: 0,
    awaitingShipment: 0,
    readyForPickup: 0,
    overdue: 0,
  };
  let dbError: string | null = null;

  try {
    [orders, counters] = await Promise.all([
      listSellerOrders(seller.sellerProfileId, {
        bucket: bucket === "ALL" ? undefined : bucket,
        from: from && !Number.isNaN(from.getTime()) ? from : undefined,
        to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      }),
      getSellerOrderCounters(seller.sellerProfileId),
    ]);
  } catch (err) {
    console.error("[seller/orders]", err);
    dbError = "Не удалось загрузить заказы";
  }

  const ordersEmptyCopy =
    bucket === "ALL" ? await getSellerJourneyEmptyState("orders") : null;

  function tabHref(value: string) {
    const q = new URLSearchParams();
    if (value !== "ALL") q.set("bucket", value);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const qs = q.toString();
    return qs ? `${ROUTES.SELLER_ORDERS}?${qs}` : ROUTES.SELLER_ORDERS;
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <SellerToastFlash />
      </Suspense>

      <SellerFirstEntryBannerSlot sellerProfileId={seller.sellerProfileId} />

      {counters.overdue > 0 ? (
        <div
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
          data-testid="seller-orders-overdue-banner"
        >
          <p className="font-medium text-destructive">
            {counters.overdue} заказ(ов) просрочено
          </p>
          <p className="mt-1 text-muted-foreground">
            Отправьте товары в срок — просрочка снижает рейтинг магазина.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            nativeButton={false}
            render={<Link href={tabHref("OVERDUE")} />}
          >
            Открыть просроченные
          </Button>
        </div>
      ) : null}

      <OrderFulfillmentSteps />

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Заказы
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Жизненный цикл продаж: подтверждение, сборка, отправка и выдача.
        </p>
        {isMarketplaceDeliveryEnabled() ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            nativeButton={false}
            render={<Link href={ROUTES.ACCOUNT_ORDERS_SHIP} />}
          >
            Нужно отправить →
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Новых", value: counters.newCount },
          { label: "В работе", value: counters.inProgress },
          { label: "К отправке", value: counters.awaitingShipment },
          { label: "К выдаче", value: counters.readyForPickup },
          { label: "Просрочено", value: counters.overdue },
        ].map((c) => (
          <Card key={c.label} className="border-border/80">
            <CardHeader className="p-3 pb-1">
              <CardDescription className="text-xs">{c.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{c.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {BUCKET_TABS.map((tab) => {
          const active = bucket === tab.value;
          return (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : orders.items.length === 0 ? (
        ordersEmptyCopy ? (
          <SellerJourneyEmptyState {...ordersEmptyCopy} />
        ) : (
          <p className="text-sm text-muted-foreground">Заказов пока нет</p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {orders.items.map((order) => (
            <Card key={order.id} className="border-border/80">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {order.orderNumber}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {formatOrderDate(order.createdAt)} ·{" "}
                    {order.buyerName ?? order.buyerEmail}
                    {" · "}
                    {order.fulfillmentType === "SELLER_PICKUP"
                      ? "Самовывоз"
                      : "Доставка"}
                  </CardDescription>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.sellerItemNames.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  {order.isOverdue ? (
                    <Badge variant="destructive">
                      Просрочен
                      {order.overdueReason
                        ? ` · ${order.overdueReason}`
                        : ""}
                    </Badge>
                  ) : null}
                  <span className="text-sm font-medium">
                    {formatPrice(order.sellerSubtotal, order.currency)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Статус: {formatOrderStatus(order.status)} · позиций:{" "}
                  {order.itemCount}
                </p>
                <SellerOrderStatusActions
                  orderId={order.id}
                  status={order.status}
                  role={UserRole.SELLER}
                  fulfillmentType={order.fulfillmentType}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
