import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Car,
  Home,
  Shirt,
  Smartphone,
  Wrench,
} from "lucide-react";

import { HomeCategoryLink } from "@/components/home/home-product-grid";
import { Button } from "@/components/ui/button";
import { categoryPagePath } from "@/features/catalog/paths";
import type { CategoryListItem } from "@/features/catalog/queries";
import { ROUTES } from "@/lib/constants";
import { pluralizeProductCount } from "@/lib/i18n";

const POPULAR: {
  name: string;
  slug: string;
  icon: LucideIcon;
  hint: string;
}[] = [
  {
    name: "Инструменты",
    slug: "tools",
    icon: Wrench,
    hint: "Электроинструмент и ручной",
  },
  {
    name: "Электроника",
    slug: "electronics",
    icon: Smartphone,
    hint: "Гаджеты и техника",
  },
  {
    name: "Дом",
    slug: "home",
    icon: Home,
    hint: "Мебель и уют",
  },
  {
    name: "Авто",
    slug: "auto",
    icon: Car,
    hint: "Аксессуары и уход",
  },
  {
    name: "Одежда",
    slug: "clothing",
    icon: Shirt,
    hint: "Стиль на каждый день",
  },
];

type PopularCategoriesProps = {
  categories: CategoryListItem[];
};

export function PopularCategories({ categories }: PopularCategoriesProps) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div
        className="animate-fade-up mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        style={{ animationDelay: "80ms" }}
      >
        <div>
          <h2 className="home-section-title font-heading font-semibold tracking-tight">
            Популярные категории
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Выберите направление — тысячи товаров в каждой.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          nativeButton={false}
          render={<Link href={ROUTES.CATEGORIES} />}
        >
          Все категории
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {POPULAR.map((item, index) => {
          const live = bySlug.get(item.slug);
          const count = live?.productCount;
          const Icon = item.icon;

          return (
            <HomeCategoryLink
              key={item.slug}
              href={categoryPagePath(item.slug)}
              slug={item.slug}
              className="animate-fade-up group cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ animationDelay: `${100 + index * 45}ms` }}
            >
              <article className="flex h-full min-h-[132px] flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 ring-1 ring-border transition-[box-shadow,transform,background-color,border-color,ring-color] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-card-hover group-hover:ring-primary/35">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-[var(--duration-base)] group-hover:scale-110">
                  <Icon className="size-6" aria-hidden />
                </div>
                <div>
                  <p className="font-heading text-base font-medium leading-snug">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {typeof count === "number"
                      ? pluralizeProductCount(count)
                      : item.hint}
                  </p>
                </div>
              </article>
            </HomeCategoryLink>
          );
        })}
      </div>
    </section>
  );
}
