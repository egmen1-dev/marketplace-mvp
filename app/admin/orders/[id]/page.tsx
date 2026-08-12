import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminOrderDetail } from "@/features/admin";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { formatDateTimeMoscow } from "@/lib/format/datetime";

export const metadata = {
  title: "Админ · Заказ",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  PROCESSING: "В работе",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

function formatDate(d: Date) {
  return formatDateTimeMoscow(d);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrderDetail(id);
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={ROUTES.ADMIN_ORDERS} />}
        >
          К списку
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
        {order.paymentStatus ? (
          <Badge variant="secondary">Оплата: {order.paymentStatus}</Badge>
        ) : (
          <Badge variant="outline">Без платежа</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Покупатель</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{order.buyerName || "—"}</p>
            <p className="text-muted-foreground">{order.buyerEmail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Суммы</CardTitle>
            <CardDescription>Только просмотр</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Товары: {formatPrice(order.subtotal)}</p>
            <p>Доставка: {formatPrice(order.shippingCost)}</p>
            <p className="font-medium">Итого: {formatPrice(order.total)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Позиции</CardTitle>
          <CardDescription>
            Продавцы: {order.sellerNames.join(", ") || "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.storeName} · ×{item.quantity}
                  </p>
                </div>
                <p className="tabular-nums text-sm">
                  {formatPrice(item.totalPrice)}
                </p>
              </li>
            ))}
          </ul>
          {order.notes ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Заметка: {order.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
