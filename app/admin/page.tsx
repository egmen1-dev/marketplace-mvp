import Link from "next/link";
import { Package, ShoppingBag, Store, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdminDashboardStats,
  listRecentOrders,
  listRecentUsers,
} from "@/features/admin";
import { formatPrice } from "@/features/products/mappers";
import { adminOrderPath, ROUTES } from "@/lib/constants";
import { formatDateMoscowShort } from "@/lib/format/datetime";

export const metadata = {
  title: "Admin Dashboard",
};

function formatDate(d: Date) {
  return formatDateMoscowShort(d);
}

export default async function AdminDashboardPage() {
  let stats = {
    usersCount: 0,
    sellersCount: 0,
    productsCount: 0,
    activeProductsCount: 0,
    ordersCount: 0,
    revenue: 0,
  };
  let recentUsers: Awaited<ReturnType<typeof listRecentUsers>> = [];
  let recentOrders: Awaited<ReturnType<typeof listRecentOrders>> = [];
  let dbError: string | null = null;

  try {
    [stats, recentUsers, recentOrders] = await Promise.all([
      getAdminDashboardStats(),
      listRecentUsers(8),
      listRecentOrders(8),
    ]);
  } catch (err) {
    console.error("[admin/dashboard]", err);
    dbError = "Не удалось загрузить дашборд";
  }

  const cards = [
    {
      label: "Пользователи",
      value: stats.usersCount,
      href: ROUTES.ADMIN_USERS,
      icon: Users,
    },
    {
      label: "Продавцы",
      value: stats.sellersCount,
      href: ROUTES.ADMIN_SELLERS,
      icon: Store,
    },
    {
      label: "Товары",
      value: stats.productsCount,
      href: ROUTES.ADMIN_PRODUCTS,
      icon: Package,
    },
    {
      label: "Активных товаров",
      value: stats.activeProductsCount,
      href: `${ROUTES.ADMIN_PRODUCTS}?status=ACTIVE`,
      icon: Package,
    },
    {
      label: "Заказы",
      value: stats.ordersCount,
      href: ROUTES.ADMIN_ORDERS,
      icon: ShoppingBag,
    },
    {
      label: "Выручка",
      value: formatPrice(stats.revenue),
      href: ROUTES.ADMIN_ORDERS,
      tabular: false as const,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Сводка площадки — пользователи, товары и заказы.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="block">
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader className="pb-2">
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle
                    className={
                      "font-heading text-2xl" +
                      ("tabular" in card && card.tabular === false
                        ? ""
                        : " tabular-nums")
                    }
                  >
                    {card.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние регистрации</CardTitle>
            <CardDescription>Новые пользователи</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Пока нет пользователей
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.name ?? u.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email} · {formatDate(u.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.isBlocked ? (
                        <Badge variant="destructive">блок</Badge>
                      ) : null}
                      <Badge variant="secondary">{u.role}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние заказы</CardTitle>
            <CardDescription>Недавние покупки</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Пока нет заказов
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={adminOrderPath(o.id)}
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.buyerEmail} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm tabular-nums">
                        {formatPrice(o.total)}
                      </span>
                      <Badge variant="outline">{o.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
