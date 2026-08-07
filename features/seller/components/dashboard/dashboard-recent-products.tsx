import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import { ProductStatusBadge } from "@/features/seller/components/product-status-badge";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";

import { DashboardEmptyState } from "./dashboard-empty-state";

export function DashboardRecentProducts({
  products,
}: {
  products: ProductListItem[];
}) {
  return (
    <Card className="hover:translate-y-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
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
      <CardContent className="pt-1">
        {products.length === 0 ? (
          <DashboardEmptyState
            icon={<Plus className="size-5" />}
            title="Добавьте первый товар"
            description="Создайте объявление — оно появится в каталоге и на этой панели"
            action={
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
              >
                <Plus data-icon="inline-start" />
                Добавить товар
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {products.map((product) => {
              const image = product.primaryImage;
              return (
                <li
                  key={product.id}
                  className="flex flex-col gap-3 py-3 first:pt-2 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
                      <ProductImage
                        src={image?.url}
                        alt={image?.alt ?? product.title}
                        sizes="48px"
                        containerClassName="absolute inset-0"
                        fallbackLabel={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {product.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="tabular-nums text-foreground">
                          {formatPrice(product.price)}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          Остаток: {product.stock}
                        </span>
                        <ProductStatusBadge status={product.status} />
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-0.5 sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link
                          href={`${ROUTES.PRODUCT}/${product.id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Открыть «${product.title}»`}
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
                        <Link
                          href={sellerProductEditPath(product.id)}
                          aria-label={`Редактировать «${product.title}»`}
                        />
                      }
                    >
                      <Pencil data-icon="inline-start" />
                      Редактировать
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
