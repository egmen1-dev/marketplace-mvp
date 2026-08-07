"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductStatusBadge } from "@/features/seller/components/product-status-badge";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type StockFilter = "all" | "in_stock" | "out_of_stock";
type SortKey = "popular" | "newest" | "price_asc" | "price_desc";

const selectClassName = cn(
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

type SellerProductsSectionProps = {
  products: ProductListItem[];
};

export function SellerProductsSection({
  products,
}: SellerProductsSectionProps) {
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sort, setSort] = useState<SortKey>("popular");

  const filtered = useMemo(() => {
    let list = [...products];

    if (stockFilter === "in_stock") {
      list = list.filter((p) => p.stock > 0);
    } else if (stockFilter === "out_of_stock") {
      list = list.filter((p) => p.stock <= 0);
    }

    list.sort((a, b) => {
      switch (sort) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "popular":
        default:
          return b.views - a.views;
      }
    });

    return list;
  }, [products, sort, stockFilter]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Товары</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} из {products.length}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seller-stock-filter" className="text-xs">
              Наличие
            </Label>
            <select
              id="seller-stock-filter"
              value={stockFilter}
              onChange={(e) =>
                setStockFilter(e.target.value as StockFilter)
              }
              className={selectClassName}
            >
              <option value="all">Все товары</option>
              <option value="in_stock">В наличии</option>
              <option value="out_of_stock">Нет в наличии</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seller-sort" className="text-xs">
              Сортировка
            </Label>
            <select
              id="seller-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={selectClassName}
            >
              <option value="popular">Популярные</option>
              <option value="newest">Сначала новые</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
            </select>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
          <PackageOpen className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-3 font-heading text-base font-medium">
            Пока нет активных товаров
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Когда продавец добавит товары, они появятся здесь.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            nativeButton={false}
            render={<Link href={ROUTES.CATALOG} />}
          >
            В каталог
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Нет товаров по выбранному фильтру.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <div key={product.id} className="flex flex-col gap-2">
              <ProductCard product={product} />
              <div className="flex justify-end px-1">
                <ProductStatusBadge status={product.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
