import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAdminOrders } from "@/features/admin";
import { ORDER_STATUS_LABELS } from "@/features/orders/lib/status";
import { formatPrice } from "@/features/products/mappers";
import { adminOrderPath, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Админ · Заказы",
};

const FILTERS = [
  { value: "ALL", label: "Все" },
  { value: "OVERDUE", label: "Просрочено" },
  { value: "NEW", label: "Новые" },
  { value: "AWAITING_SELLER_CONFIRMATION", label: "Ожидают" },
  { value: "CONFIRMED", label: "Подтверждённые" },
  { value: "PROCESSING", label: "В работе" },
  { value: "SHIPPED", label: "Отправленные" },
  { value: "COMPLETED", label: "Завершённые" },
  { value: "CANCELLED", label: "Отменённые" },
] as const;

function formatDate(d: Date) {
  const ms = d.getTime() + 3 * 60 * 60 * 1000;
  const m = new Date(ms);
  const day = m.getUTCDate();
  const month = m.getUTCMonth() + 1;
  const year = m.getUTCFullYear();
  const hour = String(m.getUTCHours()).padStart(2, "0");
  const minute = String(m.getUTCMinutes()).padStart(2, "0");
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const statusRaw = sp.status?.toUpperCase();
  const overdueOnly = statusRaw === "OVERDUE";
  const status =
    !overdueOnly &&
    Object.values(OrderStatus).includes(statusRaw as OrderStatus)
      ? (statusRaw as OrderStatus)
      : "ALL";
  const q = sp.q?.trim() || undefined;

  let orders: Awaited<ReturnType<typeof listAdminOrders>> = [];
  let dbError: string | null = null;

  try {
    orders = await listAdminOrders({
      status,
      q,
      overdue: overdueOnly || undefined,
    });
  } catch (err) {
    console.error("[admin/orders]", err);
    dbError = "Не удалось загрузить заказы";
  }

  function hrefFor(next: { status?: string; q?: string }) {
    const params = new URLSearchParams();
    const st = next.status ?? (overdueOnly ? "OVERDUE" : status === "ALL" ? "" : status);
    if (st) params.set("status", st);
    const query = next.q ?? q;
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `${ROUTES.ADMIN_ORDERS}?${qs}` : ROUTES.ADMIN_ORDERS;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Заказы
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          OMS: поиск и фильтр просроченных заказов.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" action={ROUTES.ADMIN_ORDERS}>
        {overdueOnly ? (
          <input type="hidden" name="status" value="OVERDUE" />
        ) : status !== "ALL" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Номер, товар, email, продавец…"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Найти
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active =
            (f.value === "OVERDUE" && overdueOnly) ||
            (f.value === "ALL" && !overdueOnly && status === "ALL") ||
            (!overdueOnly && status === f.value);
          return (
            <Link
              key={f.value}
              href={hrefFor({
                status: f.value === "ALL" ? "" : f.value,
              })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Заказов нет</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    <Link
                      href={adminOrderPath(order.id)}
                      className="hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {formatDate(order.createdAt)} · {order.buyerEmail}
                    {order.sellerNames.length
                      ? ` · ${order.sellerNames.join(", ")}`
                      : ""}
                    {order.isOverdue && order.overdueReason
                      ? ` · дедлайн: ${order.overdueReason}`
                      : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                  {order.isOverdue ? (
                    <Badge variant="destructive">Просрочен</Badge>
                  ) : null}
                  <span className="text-sm font-medium">
                    {formatPrice(order.total, order.currency)}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
