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
import { formatPrice } from "@/features/products/mappers";
import { listProducts } from "@/features/products/queries";
import { ProductStatusBadge } from "@/features/seller";
import { getSellerDashboardStats } from "@/features/seller/queries";
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
  let dbError: string | null = null;

  try {
    const [dashboard, allRecent] = await Promise.all([
      getSellerDashboardStats(seller.sellerProfileId),
      listProducts({
        sellerId: seller.sellerProfileId,
        status: "ALL",
        pageSize: 5,
        sort: "newest",
      }),
    ]);
    stats = dashboard;
    recent = allRecent;
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
    { label: "Просмотры", value: stats.viewsSum },
    { label: "В избранном", value: stats.favoritesSum },
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card id="sales-chart">
        <CardHeader>
          <CardTitle>Продажи</CardTitle>
          <CardDescription>
            График продаж появится в следующем релизе. Пока — сводка по
            оплаченным заказам.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-2 rounded-xl bg-muted/40 px-4 py-6">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-primary/40"
                style={{ height: `${h}%` }}
                aria-hidden
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Placeholder · данные: {stats.salesCount} шт. /{" "}
            {formatPrice(stats.revenue)}
          </p>
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
  );
}
