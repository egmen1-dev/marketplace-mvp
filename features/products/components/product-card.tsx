"use client";

import Link from "next/link";
import { MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/features/cart/components";
import { FavoriteToggleButton } from "@/features/favorites/components/favorite-toggle-button";
import { ProductImage } from "@/features/products/components/product-image";
import {
  formatPrice,
  hasDiscount,
  isHitProduct,
  isNewProduct,
} from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES, sellerPublicPath } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Presentational demo rating for marketplace cards (no DB field yet). */
const DEMO_RATING = 4.8;

type ProductCardProps = {
  product: ProductListItem;
  className?: string;
  style?: React.CSSProperties;
};

export function ProductCard({ product, className, style }: ProductCardProps) {
  const href = `${ROUTES.PRODUCT}/${product.id}`;
  const image = product.primaryImage;
  const compareAt = product.compareAt;
  const showOldPrice = hasDiscount(product.price, compareAt);
  const showNew = isNewProduct(product.createdAt);
  const showSale = showOldPrice;
  const showHit = isHitProduct(product.views, product.favoritesCount);

  return (
    <article
      className={cn(
        "group animate-fade-up flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border transition-[box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-1 hover:shadow-card-hover",
        className,
      )}
      style={style}
    >
      <div className="relative">
        <Link
          href={href}
          className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ProductImage
            src={image?.url}
            alt={image?.alt ?? product.title}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            containerClassName="aspect-[3/4] sm:aspect-[4/5]"
            className="transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-premium)] group-hover:scale-[1.06]"
          />
        </Link>

        <div className="pointer-events-none absolute top-2.5 left-2.5 flex max-w-[70%] flex-wrap gap-1">
          {showNew ? (
            <Badge className="bg-primary text-[10px] text-primary-foreground shadow-sm">
              Новинка
            </Badge>
          ) : null}
          {showSale ? (
            <Badge
              variant="secondary"
              className="bg-background/85 text-[10px] backdrop-blur-sm"
            >
              Скидка
            </Badge>
          ) : null}
          {showHit ? (
            <Badge
              variant="secondary"
              className="bg-background/85 text-[10px] backdrop-blur-sm"
            >
              Хит
            </Badge>
          ) : null}
          {!showNew && !showSale && !showHit && product.category ? (
            <Badge
              variant="secondary"
              className="max-w-full truncate bg-background/75 text-[11px] backdrop-blur-sm"
            >
              {product.category.name}
            </Badge>
          ) : null}
        </div>

        <FavoriteToggleButton productId={product.id} absolute />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
        <div className="flex items-baseline gap-2">
          <p className="font-heading text-lg leading-none font-semibold tracking-tight text-foreground sm:text-xl">
            {formatPrice(product.price, product.currency)}
          </p>
          {showOldPrice && compareAt != null ? (
            <p className="text-sm text-muted-foreground line-through">
              {formatPrice(compareAt, product.currency)}
            </p>
          ) : null}
        </div>

        <div
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title="Демо-рейтинг для витрины"
        >
          <Star
            className="size-3.5 fill-primary text-primary"
            aria-hidden
          />
          <span className="font-medium text-foreground tabular-nums">
            {DEMO_RATING.toFixed(1)}
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium">
          <Link
            href={href}
            className="transition-colors hover:text-primary focus-visible:text-primary"
          >
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto flex flex-col gap-0.5 text-xs text-muted-foreground">
          <Link
            href={sellerPublicPath(product.seller.slug)}
            className="line-clamp-1 transition-colors hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {product.seller.storeName}
          </Link>
          {product.city ? (
            <p className="flex items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="line-clamp-1">{product.city}</span>
            </p>
          ) : null}
        </div>

        <AddToCartButton
          productId={product.id}
          stock={product.stock}
          size="sm"
          className="mt-2"
          label="В корзину"
        />
      </div>
    </article>
  );
}
