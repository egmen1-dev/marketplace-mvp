import Link from "next/link";
import {
  BadgeCheck,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { categoryPagePath } from "@/features/catalog/paths";
import { formatPrice } from "@/features/products/mappers";
import { ProductImage } from "@/features/products/components/product-image";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

const showcaseCategories = [
  { name: "Инструменты", slug: "tools" },
  { name: "Электроника", slug: "electronics" },
  { name: "Дом", slug: "home" },
  { name: "Авто", slug: "auto" },
] as const;

const showcaseBenefits = [
  { icon: ShieldCheck, label: "Безопасная покупка" },
  { icon: Truck, label: "Доставка СДЭК" },
  { icon: Package, label: "Тысячи товаров" },
] as const;

type HeroShowcaseProps = {
  featured?: ProductListItem | null;
};

/**
 * Right-side marketplace collage: product preview, category chips, benefits.
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
    <div
      className="animate-fade-up relative mx-auto w-full max-w-md lg:max-w-none"
      style={{ animationDelay: "220ms" }}
    >
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
              sizes="160px"
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
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 font-medium text-primary">
                В наличии
              </span>
              <span>· в корзину с карточки</span>
            </div>
          </div>
        </Link>

        <div className="flex flex-wrap gap-2">
          {showcaseCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={categoryPagePath(cat.slug)}
              className="rounded-xl bg-surface-elevated/80 px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground hover:ring-primary/30"
            >
              {cat.name}
            </Link>
          ))}
          <Link
            href={ROUTES.CATEGORIES}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:underline"
          >
            Все →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {showcaseBenefits.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-start gap-1.5 rounded-xl bg-card/70 px-2.5 py-2.5 ring-1 ring-border"
            >
              <item.icon className="size-4 text-primary" aria-hidden />
              <span className="text-[11px] leading-snug font-medium text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-xs text-foreground ring-1 ring-primary/20">
          <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Продавцы и магазины с понятным статусом товаров на витрине
          </span>
        </div>
      </div>
    </div>
  );
}
