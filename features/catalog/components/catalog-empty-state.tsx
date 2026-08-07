import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { categoryPagePath } from "@/features/catalog/paths";
import { ROUTES } from "@/lib/constants";

export type PopularCategoryLink = {
  name: string;
  slug: string;
};

type CatalogEmptyStateProps = {
  title?: string;
  description?: string;
  /** Show CTA to full catalog (default true). */
  showCatalogCta?: boolean;
  /** Optional popular categories for discovery. */
  popularCategories?: PopularCategoryLink[];
  /** Extra reset / filter action link. */
  resetHref?: string;
  resetLabel?: string;
};

export function CatalogEmptyState({
  title = "Ничего не нашли",
  description = "Попробуйте изменить запрос или сбросить фильтры.",
  showCatalogCta = true,
  popularCategories = [],
  resetHref,
  resetLabel = "Сбросить фильтры",
}: CatalogEmptyStateProps) {
  return (
    <Card data-testid="catalog-empty">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {showCatalogCta ? (
            <Button
              className="rounded-xl"
              nativeButton={false}
              render={<Link href={ROUTES.CATALOG} />}
              data-testid="catalog-empty-cta"
            >
              Перейти в каталог
            </Button>
          ) : null}
          {resetHref ? (
            <Button
              variant="outline"
              className="rounded-xl"
              nativeButton={false}
              render={<Link href={resetHref} />}
            >
              {resetLabel}
            </Button>
          ) : null}
        </div>

        {popularCategories.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Популярные категории
            </p>
            <ul className="flex flex-wrap gap-2">
              {popularCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={categoryPagePath(cat.slug)}
                    className="inline-flex rounded-xl bg-surface px-3 py-1.5 text-sm ring-1 ring-border transition-colors hover:text-primary hover:ring-primary/40"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
