import Link from "next/link";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/products/components/product-card";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

type HistoryGridProps = {
  products: ProductListItem[];
};

export function HistoryGrid({ products }: HistoryGridProps) {
  if (products.length === 0) {
    return (
      <div className="animate-fade-up flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <Clock className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-heading text-lg font-medium">
            История просмотров пуста
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Откройте карточку товара — она появится здесь.
          </p>
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Перейти в каталог
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
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
