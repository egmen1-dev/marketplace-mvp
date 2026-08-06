import Link from "next/link";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { ProductStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSellerSession } from "@/features/auth";
import { formatOrderDate, OrderStatusBadge } from "@/features/orders";
import { formatPrice } from "@/features/products/mappers";
import { listProducts } from "@/features/products/queries";
import { ProductStatusBadge } from "@/features/seller";
import {
  getSellerDashboardStats,
  listSellerOrders,
} from "@/features/seller/queries";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Дашборд продавца",
};

export default async function SellerDashboardPage() {
  const seller = await requireSellerSession();

  let stats = {
    totalProducts: 0,
    activeProducts: 0,
    salesCount: 0,
    ordersCount: 0,
    revenue: 0,
    viewsSum: 0,
    favoritesSum: 0,
    lowStockCount: 0,
  };
  let recent: Awaited<ReturnType<typeof listProducts>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
  };
  let recentOrders: Awaited<ReturnType<typeof listSellerOrders>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
  };
  let dbError: string | null = null;

  try {
    const [dashboard, allRecent, orders] = await Promise.all([
      getSellerDashboardStats(seller.sellerProfileId),
      listProducts({
        sellerId: seller.sellerProfileId,
        status: "ALL",
        pageSize: 5,
        sort: "newest",
      }),
      listSellerOrders(seller.sellerProfileId, { pageSize: 5 }),
    ]);
    stats = dashboard;
    recent = allRecent;
    recentOrders = orders;
  } catch (err) {
    console.error("[seller/dashboard]", err);
    dbError = "Не удалось загрузить дашборд";
  }

  const cards = [
    { label: "Всего товаров", value: stats.totalProducts },
    { label: "Активных", value: stats.activeProducts },
    { label: "Продано (шт.)", value: stats.salesCount },
    { label: "Заказов", value: stats.ordersCount },
    {
      label: "Выручка",
      value: formatPrice(stats.revenue),
      tabular: false,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Главная
            </h1>
            <Badge variant="secondary">Seller</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {seller.storeName}
            {seller.name ? ` · ${seller.name}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.SELLER_PRODUCTS} />}
          >
            <Package data-icon="inline-start" />
            Товары
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
          >
            <Plus data-icon="inline-start" />
            Добавить товар
          </Button>
        </div>
      </div>

      {stats.lowStockCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Низкий остаток у {stats.lowStockCount}{" "}
            {stats.lowStockCount === 1 ? "товара" : "товаров"}. Проверьте
            склад на странице товаров.
          </p>
        </div>
      ) : null}

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.label}>
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
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
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
          <CardContent>
            {recentOrders.items.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Пока нет заказов.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.items.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{order.orderNumber}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatOrderDate(order.createdAt)} ·{" "}
                      {formatPrice(order.sellerSubtotal, order.currency)} ·{" "}
                      {order.itemCount} шт.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Недавние товары</CardTitle>
              <CardDescription>
                Активные объявления видны в{" "}
                <Link
                  href={ROUTES.CATALOG}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  каталоге
                </Link>
                .
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              nativeButton={false}
              render={<Link href={ROUTES.SELLER_PRODUCTS} />}
            >
              Все товары
            </Button>
          </CardHeader>
          <CardContent>
            {recent.items.length === 0 ? (
              <div className="flex flex-col items-start gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Пока нет товаров. Создайте первое объявление.
                </p>
                <Button
                  nativeButton={false}
                  render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
                >
                  <Plus data-icon="inline-start" />
                  Создать товар
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.items.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={sellerProductEditPath(product.id)}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {product.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">
                          {formatPrice(product.price)}
                        </span>
                        {product.status === ProductStatus.ACTIVE &&
                        product.stock > 0 &&
                        product.stock <= 5 ? (
                          <Badge variant="outline" className="text-amber-700">
                            Мало на складе
                          </Badge>
                        ) : null}
                        <ProductStatusBadge status={product.status} />
                      </div>
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
