import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatOrderDate, OrderStatusBadge } from "@/features/orders";
import { formatPrice } from "@/features/products/mappers";
import type { SellerOrderListItem } from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";

import { DashboardEmptyState } from "./dashboard-empty-state";

export function DashboardRecentOrders({
  orders,
}: {
  orders: SellerOrderListItem[];
}) {
  return (
    <Card className="hover:translate-y-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <CardTitle>Недавние заказы</CardTitle>
          <CardDescription>
            Последние заказы с вашими товарами
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          nativeButton={false}
          render={<Link href={ROUTES.SELLER_ORDERS} />}
        >
          Все заказы
        </Button>
      </CardHeader>
      <CardContent className="pt-1">
        {orders.length === 0 ? (
          <DashboardEmptyState
            icon={<ShoppingBag className="size-5" />}
            title="Заказов пока нет"
            description="Когда покупатели оформят заказ, он появится здесь"
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={ROUTES.SELLER_PRODUCTS} />}
              >
                <Package data-icon="inline-start" />
                Посмотреть товары
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-1.5 py-3 first:pt-2 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium tabular-nums">{order.orderNumber}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {order.sellerItemNames.length > 0
                    ? order.sellerItemNames.join(", ")
                    : `${order.itemCount} шт.`}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">
                    {formatPrice(order.sellerSubtotal, order.currency)}
                  </span>
                  {" · "}
                  {formatOrderDate(order.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
