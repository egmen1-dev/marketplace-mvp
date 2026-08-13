"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { ProductCard } from "@/features/products/components/product-card";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";
import type { DiscoverySituation } from "@/lib/marketplace-discovery/types";
import { trackSituationSelected } from "@/lib/marketplace-discovery/analytics";

type DiscoverySituationsProps = {
  situations: DiscoverySituation[];
  loadProducts: (situationId: string) => Promise<
    Array<{
      product: ProductListItem;
      reasons: Array<{ id: string; label: string }>;
    }>
  >;
};

export function DiscoverySituations({
  situations,
  loadProducts,
}: DiscoverySituationsProps) {
  const [active, setActive] = useState<string | null>(null);
  const [items, setItems] = useState<
    Awaited<ReturnType<DiscoverySituationsProps["loadProducts"]>>
  >([]);
  const [pending, startTransition] = useTransition();

  function select(id: string) {
    setActive(id);
    trackSituationSelected(id);
    startTransition(async () => {
      setItems(await loadProducts(id));
    });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="discovery-situations">
      <div>
        <h3 className="font-heading text-xl font-semibold">Что вам нужно?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Подборка без поиска — по ситуации
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {situations.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={pending}
            onClick={() => select(s.id)}
            className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
              active === s.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map(({ product }) => (
            <Link key={product.id} href={`${ROUTES.PRODUCT}/${product.id}`}>
              <ProductCard product={product} />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
