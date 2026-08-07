import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/products/components/product-card";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

type SimilarProductsProps = {
  products: ProductListItem[];
};

export function SimilarProducts({ products }: SimilarProductsProps) {
  if (products.length === 0) {
    return (
      <section
        id="similar"
        className="mt-10 scroll-mt-24 sm:mt-14"
        data-testid="pdp-similar-empty"
      >
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Похожие товары
        </h2>
        <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-8">
          <p className="text-sm text-muted-foreground">
            В этой категории пока нет похожих предложений — загляните в каталог.
          </p>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={ROUTES.CATALOG} />}
          >
            Смотреть каталог
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="similar"
      className="mt-10 scroll-mt-24 sm:mt-14"
      data-testid="pdp-similar"
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Похожие товары
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Весь каталог
        </Button>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
    </section>
  );
}
