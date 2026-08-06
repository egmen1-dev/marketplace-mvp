import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
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
import {
  AuthRequiredError,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import { formatPrice } from "@/features/products/mappers";
import { listProducts } from "@/features/products/queries";
import {
  DeleteProductButton,
  ProductStatusBadge,
} from "@/features/seller";
import {
  ArchiveProductButton,
  DuplicateProductButton,
} from "@/features/seller/components/product-row-actions";
import { isLowStock } from "@/features/orders/lib/inventory-sync";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Мои товары",
};

function formatCreatedAt(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function SellerProductsPage() {
  let sellerProfileId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      redirect(
        `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.SELLER_PRODUCTS)}`,
      );
    }
    if (err instanceof SellerRequiredError) {
      redirect(ROUTES.HOME);
    }
    throw err;
  }

  let products: Awaited<ReturnType<typeof listProducts>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  };
  let dbError: string | null = null;

  try {
    products = await listProducts({
      sellerId: sellerProfileId,
      status: "ALL",
      pageSize: 100,
      sort: "newest",
    });
  } catch (err) {
    console.error("[seller/products]", err);
    dbError = "Не удалось загрузить товары";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Товары
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Все статусы. В каталоге видны только активные.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
        >
          <Plus data-icon="inline-start" />
          Добавить товар
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список товаров</CardTitle>
          <CardDescription>
            {products.total > 0
              ? `${products.total} ${products.total === 1 ? "товар" : "товаров"}`
              : "Управление объявлениями магазина"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dbError ? (
            <p className="text-sm text-destructive">{dbError}</p>
          ) : products.items.length === 0 ? (
            <div className="flex flex-col items-start gap-4 py-8">
              <p className="text-sm text-muted-foreground">
                Пока нет товаров. Создайте первое объявление — оно сразу
                появится в каталоге.
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 pr-3 font-medium">Фото</th>
                  <th className="pb-3 pr-3 font-medium">Название</th>
                  <th className="pb-3 pr-3 font-medium">Категория</th>
                  <th className="pb-3 pr-3 font-medium">Цена</th>
                  <th className="pb-3 pr-3 font-medium">Склад</th>
                  <th className="pb-3 pr-3 font-medium">Статус</th>
                  <th className="pb-3 pr-3 font-medium">Создан</th>
                  <th className="pb-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.items.map((product) => {
                  const image = product.primaryImage;
                  return (
                    <tr key={product.id} className="align-middle">
                      <td className="py-3 pr-3">
                        <div className="relative size-12 overflow-hidden rounded-lg bg-surface-elevated">
                          {image ? (
                            <Image
                              src={image.url}
                              alt={image.alt ?? product.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div
                              aria-hidden
                              className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-surface"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="max-w-[180px] truncate font-medium">
                          {product.title}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatPrice(product.price)}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="tabular-nums">{product.stock}</span>
                        {isLowStock(product.stock) ? (
                          <Badge
                            variant="outline"
                            className="ml-2 text-amber-700 dark:text-amber-300"
                          >
                            Мало
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <ProductStatusBadge status={product.status} />
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {formatCreatedAt(product.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            nativeButton={false}
                            render={
                              <Link href={sellerProductEditPath(product.id)} />
                            }
                          >
                            <Pencil data-icon="inline-start" />
                            Изменить
                          </Button>
                          <DuplicateProductButton productId={product.id} />
                          <ArchiveProductButton
                            productId={product.id}
                            isArchived={
                              product.status === ProductStatus.ARCHIVED
                            }
                          />
                          <DeleteProductButton
                            productId={product.id}
                            productTitle={product.title}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
