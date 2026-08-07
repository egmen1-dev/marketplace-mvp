import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { ProductStatus } from "@prisma/client";

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
import { ProductImage } from "@/features/products/components/product-image";
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
import { StockEditor } from "@/features/seller/components/stock-editor";
import { SellerToastFlash } from "@/features/seller/components/seller-toast-flash";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Мои товары",
};

const STATUS_TABS: { value: ProductStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: ProductStatus.ACTIVE, label: "Активные" },
  { value: ProductStatus.DRAFT, label: "Черновики" },
  { value: ProductStatus.ARCHIVED, label: "Архив" },
];

function formatCreatedAt(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; toast?: string }>;
};

export default async function SellerProductsPage({ searchParams }: PageProps) {
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

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const statusRaw = params.status?.toUpperCase();
  const status: ProductStatus | "ALL" =
    statusRaw &&
    (STATUS_TABS.some((t) => t.value === statusRaw) || statusRaw === "ALL")
      ? (statusRaw as ProductStatus | "ALL")
      : "ALL";

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
      status,
      query,
      pageSize: 100,
      sort: "newest",
    });
  } catch (err) {
    console.error("[seller/products]", err);
    dbError = "Не удалось загрузить товары";
  }

  function tabHref(value: ProductStatus | "ALL") {
    const q = new URLSearchParams();
    if (value !== "ALL") q.set("status", value);
    if (query) q.set("q", query);
    const qs = q.toString();
    return qs ? `${ROUTES.SELLER_PRODUCTS}?${qs}` : ROUTES.SELLER_PRODUCTS;
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <SellerToastFlash />
      </Suspense>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Товары
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поиск, фильтры и склад. В каталоге видны только активные.
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
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Поиск
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Название или категория"
            className="h-10 rounded-xl border border-input bg-surface px-3 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Найти
        </button>
      </form>

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
                {query || status !== "ALL"
                  ? "Нет товаров по выбранным фильтрам."
                  : "Пока нет товаров. Создайте первое объявление — оно сразу появится в каталоге."}
              </p>
              {!query && status === "ALL" ? (
                <Button
                  nativeButton={false}
                  render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
                >
                  <Plus data-icon="inline-start" />
                  Создать товар
                </Button>
              ) : null}
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
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
                        <div className="relative size-12 overflow-hidden rounded-lg">
                          <ProductImage
                            src={image?.url}
                            alt={image?.alt ?? product.title}
                            sizes="48px"
                            containerClassName="absolute inset-0"
                            fallbackLabel={false}
                          />
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
                        <StockEditor
                          productId={product.id}
                          stock={product.stock}
                        />
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
                              <Link
                                href={`${ROUTES.PRODUCT}/${product.id}`}
                                target="_blank"
                              />
                            }
                          >
                            <ExternalLink data-icon="inline-start" />
                            Открыть
                          </Button>
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
