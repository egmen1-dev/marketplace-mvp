"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CategoryListItem } from "@/features/catalog/queries";
import { categoryPagePath } from "@/features/catalog/paths";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CategoryFilterProps = {
  categories: CategoryListItem[];
  activeSlug?: string;
  basePath?: string;
};

export function CategoryFilter({
  categories,
  activeSlug,
  basePath = ROUTES.CATALOG,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={!activeSlug ? "default" : "outline"}
        render={<Link href={basePath} />}
        className={cn("cursor-pointer", !activeSlug && "pointer-events-none")}
      >
        Все
      </Badge>
      {categories.map((category) => {
        const active = category.slug === activeSlug;
        const href =
          basePath === ROUTES.CATALOG
            ? categoryPagePath(category.slug)
            : `${basePath}?category=${category.slug}`;
        return (
          <Badge
            key={category.id}
            variant={active ? "default" : "outline"}
            render={<Link href={href} />}
            className={cn("cursor-pointer", active && "pointer-events-none")}
          >
            {category.name}
            <span className="opacity-70">({category.productCount})</span>
          </Badge>
        );
      })}
    </div>
  );
}
