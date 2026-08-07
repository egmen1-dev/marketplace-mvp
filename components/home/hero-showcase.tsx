import Link from "next/link";
import { Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/features/products/mappers";
import { ProductImage } from "@/features/products/components/product-image";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

type HeroShowcaseProps = {
  featured?: ProductListItem | null;
};

/**
 * Right-side hero: featured product + one trust signal (no duplicate trust grid).
 */
export function HeroShowcase({ featured }: HeroShowcaseProps) {
  const href = featured
    ? `${ROUTES.PRODUCT}/${featured.id}`
    : ROUTES.CATALOG;
  const title = featured?.title ?? "Популярные товары рядом";
  const priceLabel = featured
    ? formatPrice(featured.price, featured.currency)
    : "от 990 ₽";
  const seller = featured?.seller.storeName ?? "Магазины на Лот";
  const image = featured?.primaryImage;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_30%_20%,rgb(255_106_0_/_18%),transparent_55%)]"
      />

      <div className="relative grid gap-3">
        <Link
          href={href}
          className="group flex gap-3.5 rounded-2xl bg-card/90 p-3 ring-1 ring-border shadow-card backdrop-blur-sm transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <div className="relative w-[38%] shrink-0 overflow-hidden rounded-xl">
            <ProductImage
              src={image?.url}
              alt={image?.alt ?? title}
              sizes="(max-width: 1024px) 42vw, 200px"
              priority
              quality={75}
              containerClassName="aspect-[4/5]"
              className="transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
            />
            <Badge className="absolute top-2 left-2 bg-primary text-[10px] text-primary-foreground shadow-sm">
              Хит
            </Badge>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <div>
              <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                {priceLabel}
              </p>
              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
                {title}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {seller}
              </p>
            </div>
            <div className="mt-3">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                В наличии
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-xs text-foreground ring-1 ring-primary/20">
          <Truck className="size-4 shrink-0 text-primary" aria-hidden />
          <span>Доставка через пункты СДЭК</span>
        </div>
      </div>
    </div>
  );
}
