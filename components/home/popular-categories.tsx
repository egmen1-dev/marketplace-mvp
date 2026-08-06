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

import { Button } from "@/components/ui/button";
import { categoryPagePath } from "@/features/catalog/paths";
import type { CategoryListItem } from "@/features/catalog/queries";
import { ROUTES } from "@/lib/constants";

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
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
      <div
        className="animate-fade-up mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        style={{ animationDelay: "80ms" }}
      >
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Популярные категории
          </h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Быстрый вход в каталог по самым востребованным направлениям.
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
            <Link
              key={item.slug}
              href={categoryPagePath(item.slug)}
              className="animate-fade-up group"
              style={{ animationDelay: `${100 + index * 45}ms` }}
            >
              <article className="flex h-full flex-col gap-4 rounded-2xl bg-card/80 p-4 ring-1 ring-border transition-[box-shadow,transform,ring-color] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary/35">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-[var(--duration-base)] group-hover:scale-105">
                  <Icon className="size-6" aria-hidden />
                </div>
                <div>
                  <p className="font-heading text-base font-medium leading-snug">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {typeof count === "number"
                      ? `${count} товаров`
                      : item.hint}
                  </p>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
