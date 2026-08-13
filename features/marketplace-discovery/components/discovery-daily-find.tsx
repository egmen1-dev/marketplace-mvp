"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { trackDiscoveryProductClick } from "@/lib/marketplace-discovery/analytics";
import type { DiscoveryProductCard } from "@/lib/marketplace-discovery/types";

type DiscoveryDailyFindProps = {
  item: DiscoveryProductCard;
};

export function DiscoveryDailyFind({ item }: DiscoveryDailyFindProps) {
  const { product, reasons } = item;

  return (
    <div
      className="grid gap-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-6 lg:grid-cols-[240px_1fr]"
      data-testid="discovery-daily-find"
    >
      <Link
        href={`${ROUTES.PRODUCT}/${product.id}`}
        onClick={() => trackDiscoveryProductClick(product.id)}
        className="block overflow-hidden rounded-xl border border-border bg-card"
      >
        {product.primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImage.url}
            alt={product.title}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">
            Нет фото
          </div>
        )}
      </Link>
      <div>
        <p className="text-sm font-medium text-primary">🔥 Находка дня</p>
        <h3 className="mt-2 font-heading text-xl font-semibold">{product.title}</h3>
        <p className="mt-1 font-heading text-2xl text-primary">
          {formatPrice(product.price, product.currency)}
        </p>
        <p className="mt-4 text-sm font-medium">Почему мы выбрали:</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {reasons.map((r) => (
            <li key={r.id}>✓ {r.label}</li>
          ))}
        </ul>
        <Button
          className="mt-4"
          nativeButton={false}
          render={
            <Link
              href={`${ROUTES.PRODUCT}/${product.id}`}
              onClick={() => trackDiscoveryProductClick(product.id)}
            />
          }
        >
          Посмотреть товар
        </Button>
      </div>
    </div>
  );
}
