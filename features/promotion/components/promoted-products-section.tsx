import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/features/products";
import type { ProductListItem } from "@/features/products/types";
import {
  PromotionSurfaceTracker,
  trackPromotionClick,
} from "@/features/promotion/components/promotion-surface-tracker";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import type { PromotionSurfaceType } from "@/lib/promotion/surfaces";

type PromotedProductsSectionProps = {
  title?: string;
  products: ProductListItem[];
  catalogHref?: string;
  surface: PromotionSurfaceType;
};

/**
 * Optional promoted strip — rendered only when PROMOTION_SURFACES_ENABLED=true.
 * Does not alter search ranking or replace organic blocks.
 */
export function PromotedProductsSection({
  title = "Рекомендуем",
  products,
  catalogHref = ROUTES.CATALOG,
  surface,
}: PromotedProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section
      className="border-t border-border"
      data-testid="promoted-products-section"
      data-promotion-surface={surface}
    >
      <PromotionSurfaceTracker
        surface={surface}
        productIds={products.map((p) => p.id)}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="home-section-title font-heading font-semibold tracking-tight">
                {title}
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                Продвигается
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground sm:text-base">
              Товары с активным продвижением от продавцов — отдельный блок, не
              заменяет органическую выдачу.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded-xl border-border"
            nativeButton={false}
            render={<Link href={catalogHref} />}
          >
            Смотреть всё
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="relative"
              onClickCapture={() => trackPromotionClick(surface, product.id)}
            >
              <Badge
                variant="secondary"
                className="absolute left-2 top-2 z-10 text-[10px]"
              >
                Продвигается
              </Badge>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
