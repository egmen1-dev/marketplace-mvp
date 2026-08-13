import { Star, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HeroProductLink } from "@/components/home/hero-product-link";
import {
  formatPrice,
  isHitProduct,
} from "@/features/products/mappers";
import { ProductImage } from "@/features/products/components/product-image";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";
import { formatCount } from "@/lib/format/number";
import { cn } from "@/lib/utils";

type HeroShowcaseProps = {
  featured?: ProductListItem | null;
  /** Up to 4 secondary tiles around the hero product. */
  thumbnails?: ProductListItem[];
  /** Tighter horizontal card for mobile above-the-fold placement. */
  variant?: "default" | "compact";
};

/**
 * Right-side hero: featured product + satellite thumbnails (marketplace scale).
 */
export function HeroShowcase({
  featured,
  thumbnails = [],
  variant = "default",
}: HeroShowcaseProps) {
  const compact = variant === "compact";
  const href = featured
    ? `${ROUTES.PRODUCT}/${featured.id}`
    : ROUTES.CATALOG;
  const title = featured?.title ?? "Популярные товары рядом";
  const priceLabel = featured
    ? formatPrice(featured.price, featured.currency)
    : "от 990 ₽";
  const seller = featured?.seller.storeName ?? "Магазины на Лот";
  const image = featured?.primaryImage;
  const productId = featured?.id ?? "catalog";
  const showHit =
    featured != null &&
    isHitProduct(featured.views, featured.favoritesCount);
  const socialProof =
    featured != null && featured.views > 0
      ? `${formatCount(featured.views)} просмотров`
      : featured != null && featured.favoritesCount > 0
        ? `${formatCount(featured.favoritesCount)} в избранном`
        : null;

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md lg:max-w-none",
        compact && "max-w-none",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_30%_20%,rgb(255_106_0_/_22%),transparent_55%)]"
      />

      <div className="relative grid gap-3">
        <HeroProductLink
          href={href}
          productId={productId}
          className={cn(
            "group rounded-2xl border border-border bg-card/95 ring-1 ring-border shadow-card backdrop-blur-sm transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-0.5 hover:shadow-card-hover",
            compact
              ? "flex gap-3 p-2.5"
              : "flex flex-col gap-0 overflow-hidden p-0",
          )}
        >
          <div
            className={cn(
              "relative shrink-0 overflow-hidden",
              compact
                ? "w-[34%] rounded-xl"
                : "w-full rounded-t-2xl rounded-b-none",
            )}
          >
            <ProductImage
              src={image?.url}
              alt={image?.alt ?? title}
              sizes={
                compact
                  ? "(max-width: 1024px) 34vw, 160px"
                  : "(max-width: 1024px) 100vw, 520px"
              }
              priority
              quality={75}
              containerClassName={compact ? "aspect-[4/5]" : "aspect-[16/10]"}
              className="transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
            />
            {showHit ? (
              <Badge className="absolute top-2 left-2 bg-primary text-[10px] text-primary-foreground shadow-sm">
                Хит
              </Badge>
            ) : null}
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col justify-between",
              compact ? "py-0.5" : "gap-3 p-4 sm:p-5",
            )}
          >
            <div>
              <p
                className={cn(
                  "font-heading font-semibold tracking-tight text-foreground",
                  compact ? "text-xl" : "text-3xl sm:text-[2rem]",
                )}
              >
                {priceLabel}
              </p>
              <p
                className={cn(
                  "line-clamp-2 font-medium leading-snug text-foreground",
                  compact
                    ? "mt-1 text-sm"
                    : "mt-2 text-base sm:text-lg",
                )}
              >
                {title}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {seller}
              </p>
              {socialProof ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star
                    className="size-3 shrink-0 fill-primary/80 text-primary"
                    aria-hidden
                  />
                  {socialProof}
                </p>
              ) : null}
            </div>

            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                compact ? "mt-2" : "mt-1",
              )}
            >
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                В наличии
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="size-3 shrink-0 text-primary" aria-hidden />
                СДЭК
              </span>
            </div>
          </div>
        </HeroProductLink>

        {!compact && thumbnails.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {thumbnails.slice(0, 4).map((item) => (
              <HeroProductLink
                key={item.id}
                href={`${ROUTES.PRODUCT}/${item.id}`}
                productId={item.id}
                className="group overflow-hidden rounded-xl border border-border bg-card/80 ring-1 ring-border transition-transform hover:-translate-y-0.5"
              >
                <ProductImage
                  src={item.primaryImage?.url}
                  alt={item.primaryImage?.alt ?? item.title}
                  sizes="80px"
                  quality={60}
                  containerClassName="aspect-square"
                  className="transition-transform group-hover:scale-105"
                />
                <p className="truncate px-1.5 py-1 text-[10px] font-medium text-foreground">
                  {formatPrice(item.price, item.currency)}
                </p>
              </HeroProductLink>
            ))}
          </div>
        ) : null}

        {!compact ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs text-foreground">
            <Truck className="size-4 shrink-0 text-primary" aria-hidden />
            <span>Доставка через пункты СДЭК по всей России</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
