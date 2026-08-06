import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAdminOrders } from "@/features/admin";
import { formatPrice } from "@/features/products/mappers";
import { adminOrderPath, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Админ · Заказы",
};

const FILTERS = [
  { value: "ALL", label: "Все" },
  ...Object.values(OrderStatus).map((s) => ({ value: s, label: s })),
] as const;

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  PROCESSING: "В работе",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type SearchParams = Promise<{ status?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const statusRaw = sp.status?.toUpperCase();
  const status = Object.values(OrderStatus).includes(statusRaw as OrderStatus)
    ? (statusRaw as OrderStatus)
    : "ALL";

  let orders: Awaited<ReturnType<typeof listAdminOrders>> = [];
  let dbError: string | null = null;

  try {
    orders = await listAdminOrders({ status });
  } catch (err) {
    console.error("[admin/orders]", err);
    dbError = "Не удалось загрузить заказы";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Заказы
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Просмотр всех заказов. Оплата не меняется из админки.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href =
            f.value === "ALL"
              ? ROUTES.ADMIN_ORDERS
              : `${ROUTES.ADMIN_ORDERS}?status=${f.value}`;
          const active = status === f.value;
          return (
            <Link
              key={f.value}
              href={href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
          <CardDescription>
            {orders.length > 0 ? `${orders.length} заказов` : "Заказов нет"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbError ? (
            <p className="text-sm text-destructive">{dbError}</p>
          ) : orders.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">
              Заказов с выбранным фильтром нет.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Номер</th>
                    <th className="px-2 py-2 font-medium">Дата</th>
                    <th className="px-2 py-2 font-medium">Покупатель</th>
                    <th className="px-2 py-2 font-medium">Продавец</th>
                    <th className="px-2 py-2 font-medium">Сумма</th>
                    <th className="px-2 py-2 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-2 py-3">
                        <Link
                          href={adminOrderPath(o.id)}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-2 py-3 tabular-nums text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-2 py-3">
                        <div>
                          <p>{o.buyerName || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.buyerEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {o.sellerNames.join(", ") || "—"}
                      </td>
                      <td className="px-2 py-3 tabular-nums">
                        {formatPrice(o.total)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant="outline">
                          {STATUS_LABELS[o.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
