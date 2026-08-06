"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFavorites } from "@/features/favorites/components/favorites-provider";
import { ProductCard } from "@/features/products/components/product-card";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

type FavoritesGridProps = {
  products: ProductListItem[];
};

export function FavoritesGrid({ products }: FavoritesGridProps) {
  const { ids, ready } = useFavorites();

  if (!ready) {
    return (
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy
        aria-label="Загрузка избранного"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-muted/60 ring-1 ring-border"
          />
        ))}
      </div>
    );
  }

  const visible = products.filter((p) => ids.has(p.id));

  if (visible.length === 0) {
    return (
      <div className="animate-fade-up flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <Heart className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-heading text-lg font-medium">
            В избранном пока пусто
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Нажимайте ♥ на карточках товаров, чтобы сохранить их здесь.
          </p>
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Смотреть каталог
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {visible.map((product, i) => (
        <li
          key={product.id}
          className="animate-fade-up list-none"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
