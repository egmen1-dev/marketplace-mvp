import Link from "next/link";
import { Suspense } from "react";
import { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSellerCabinetAccess } from "@/features/auth";
import { formatOrderDate, formatOrderStatus, OrderStatusBadge } from "@/features/orders";
import { formatPrice } from "@/features/products/mappers";
import { SellerOrderStatusActions } from "@/features/seller/components/seller-order-status-actions";
import { SellerToastFlash } from "@/features/seller/components/seller-toast-flash";
import { listSellerOrders } from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Продажи",
};

const STATUS_TABS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: OrderStatus.NEW, label: "Новые" },
  { value: OrderStatus.PAID, label: "Оплачены" },
  { value: OrderStatus.PROCESSING, label: "В обработке" },
  { value: OrderStatus.SHIPPED, label: "Отправлены" },
  { value: OrderStatus.DELIVERED, label: "Доставлены" },
  { value: OrderStatus.CANCELLED, label: "Отменены" },
];

type PageProps = {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
};

export default async function SellerOrdersPage({ searchParams }: PageProps) {
  const seller = await requireSellerCabinetAccess(ROUTES.SELLER_ORDERS);
  const params = await searchParams;

  const statusRaw = params.status?.toUpperCase();
  const status: OrderStatus | "ALL" =
    statusRaw &&
    (STATUS_TABS.some((t) => t.value === statusRaw) || statusRaw === "ALL")
      ? (statusRaw as OrderStatus | "ALL")
      : "ALL";

  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  let orders: Awaited<ReturnType<typeof listSellerOrders>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };
  let dbError: string | null = null;

  try {
    orders = await listSellerOrders(seller.sellerProfileId, {
      status,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    });
  } catch (err) {
    console.error("[seller/orders]", err);
    dbError = "Не удалось загрузить заказы";
  }

  function tabHref(value: OrderStatus | "ALL") {
    const q = new URLSearchParams();
    if (value !== "ALL") q.set("status", value);
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

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Продажи
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Новые заказы, обработка и завершённые продажи.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        {status !== "ALL" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          С
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="h-10 rounded-xl border border-input bg-surface px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          По
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="h-10 rounded-xl border border-input bg-surface px-3 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Фильтр
        </button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
          <CardDescription>
            {orders.total > 0
              ? `${orders.total} ${orders.total === 1 ? "заказ" : "заказов"}`
              : "Пока нет заказов с вашими товарами"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbError ? (
            <p className="text-sm text-destructive">{dbError}</p>
          ) : orders.items.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Нет заказов по выбранным фильтрам.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.items.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{order.orderNumber}</p>
                        <OrderStatusBadge status={order.status} />
                        <Badge variant="outline" className="tabular-nums">
                          {formatPrice(order.sellerSubtotal, order.currency)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatOrderDate(order.createdAt)} ·{" "}
                        {order.buyerName ?? order.buyerEmail} ·{" "}
                        {order.itemCount} шт. · {formatOrderStatus(order.status)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {order.sellerItemNames.join(", ")}
                      </p>
                    </div>
                    <SellerOrderStatusActions
                      orderId={order.id}
                      status={order.status}
                      role={seller.role}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
