import Link from "next/link";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { formatOrderDate } from "@/features/orders/lib/status";
import type { OrderListItem } from "@/features/orders/types";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";

type OrdersListProps = {
  orders: OrderListItem[];
};

export function OrdersList({ orders }: OrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <Package className="size-10 text-muted-foreground" />
        <div>
          <p className="font-heading text-lg font-medium">Заказов пока нет</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Оформите первый заказ из корзины.
          </p>
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Перейти в каталог
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`${ROUTES.ORDERS}/${order.id}`}
            className="block rounded-2xl border border-border bg-surface/40 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-surface/60 sm:px-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-sm font-medium sm:text-base">
                    Заказ {order.orderNumber}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {formatOrderDate(order.createdAt)}
                  {" · "}
                  {order.itemCount}{" "}
                  {pluralizeItems(order.itemCount)}
                </p>
              </div>
              <p className="font-heading text-base font-medium">
                {formatPrice(order.total, order.currency)}
              </p>
            </div>
            <Separator className="my-3 opacity-60" />
            <p className="text-xs text-muted-foreground">Открыть детали →</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function pluralizeItems(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "товара";
  return "товаров";
}
