import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CatalogBreadcrumbs } from "@/features/catalog/components/catalog-breadcrumbs";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import {
  CatalogFiltersMobile,
  CatalogFiltersSidebar,
  CatalogSortSelect,
} from "@/features/catalog/components/catalog-filters";
import { InfiniteProductGrid } from "@/features/catalog/components/infinite-product-grid";
import {
  categoryPagePath,
  getCategoryBySlug,
  listCategoryTree,
  listRootCategories,
} from "@/features/catalog";
import type { CatalogSearchParams } from "@/features/catalog/types";
import {
  CATALOG_PAGE_SIZE,
  hasActiveCatalogFilters,
  parseCatalogParams,
} from "@/features/catalog/url";
import {
  listProductCities,
  listProductSellers,
  listProducts,
} from "@/features/products";
import { pluralizeProductWord } from "@/lib/i18n";
import { APP_NAME, ROUTES } from "@/lib/constants";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await getCategoryBySlug(slug, { activeOnly: true });
    if (!category) {
      return { title: "Категория не найдена" };
    }
    const title = `Купить ${category.name} онлайн`;
    const description =
      category.description?.trim() ||
      `Купить ${category.name} онлайн на ${APP_NAME}. Выбирайте товары с доставкой.`;
    return {
      title,
      description,
      openGraph: {
        title: `${title} · ${APP_NAME}`,
        description,
      },
    };
  } catch {
    return { title: "Категория" };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const raw = await searchParams;
  const filters = parseCatalogParams(raw);

  let category: Awaited<ReturnType<typeof getCategoryBySlug>> = null;
  let categoryTree: Awaited<ReturnType<typeof listCategoryTree>> = [];
  let cities: string[] = [];
  let sellers: Awaited<ReturnType<typeof listProductSellers>> = [];
  let result: Awaited<ReturnType<typeof listProducts>> | null = null;
  let popularCategories: Awaited<ReturnType<typeof listRootCategories>> = [];
  let dbError: string | null = null;

  try {
    category = await getCategoryBySlug(slug, { activeOnly: true });
    if (!category) {
      notFound();
    }

    [categoryTree, cities, sellers, result, popularCategories] =
      await Promise.all([
        listCategoryTree({ activeOnly: true }),
        listProductCities(),
        listProductSellers(),
        listProducts({
          category: slug,
          query: filters.q,
          city: filters.city,
          seller: filters.seller,
          sellerKind: filters.sellerKind,
          condition: filters.condition,
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          inStock: filters.inStock,
          productType: filters.productType,
          facets: filters.facets,
          sort: filters.sort,
          page: 1,
          pageSize: CATALOG_PAGE_SIZE,
          status: "ACTIVE",
        }),
        listRootCategories({ activeOnly: true }),
      ]);
    popularCategories = popularCategories
      .filter((c) => c.productCount > 0 && c.slug !== slug)
      .slice(0, 6);
  } catch (err) {
    console.error("[category]", err);
    dbError = "Не удалось загрузить категорию.";
  }

  if (!category && !dbError) {
    notFound();
  }

  const items = result?.items ?? [];
  const activeFilters = hasActiveCatalogFilters({
    ...filters,
    category: undefined,
  });

  const breadcrumbItems = [
    { label: "Категории", href: ROUTES.CATEGORIES },
    ...(category?.ancestors.map((a) => ({
      label: a.name,
      href: categoryPagePath(a.slug),
    })) ?? []),
    { label: category?.name ?? slug },
  ];

  const infiniteQuery = {
    q: filters.q,
    category: slug,
    city: filters.city,
    seller: filters.seller,
    sellerKind: filters.sellerKind,
    condition: filters.condition,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    inStock: filters.inStock,
    productType: filters.productType,
    facets: filters.facets,
    sort: filters.sort,
  };
  const listKey = JSON.stringify(infiniteQuery);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <CatalogBreadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {category?.name ?? "Категория"}
          </h1>
          <p
            className="mt-1 text-sm text-muted-foreground sm:text-base"
            data-testid="catalog-result-count"
          >
            {result
              ? activeFilters || filters.q
                ? `Найдено ${result.total} ${pluralizeProductWord(result.total)}`
                : `${result.total} ${pluralizeProductWord(result.total)}`
              : category
                ? `${category.productCount} ${pluralizeProductWord(category.productCount)}`
                : null}
            {filters.q ? ` · «${filters.q}»` : null}
          </p>
          {category?.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {category.description}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-fit rounded-xl"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Весь каталог
        </Button>
      </div>

      {category && category.children.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={categoryPagePath(child.slug)}
              className="rounded-xl bg-surface px-3 py-1.5 text-sm ring-1 ring-border transition-colors hover:ring-primary/40 hover:text-primary"
            >
              {child.name}
              <span className="ml-1.5 text-muted-foreground">
                ({child.productCount})
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex gap-8">
        <Suspense fallback={null}>
          <CatalogFiltersSidebar
            categoryTree={categoryTree}
            cities={cities}
            sellers={sellers}
            lockedCategorySlug={slug}
          />
        </Suspense>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Suspense fallback={null}>
              <CatalogFiltersMobile
                categoryTree={categoryTree}
                cities={cities}
                sellers={sellers}
                lockedCategorySlug={slug}
              />
            </Suspense>
            <Suspense
              fallback={
                <div className="h-10 w-44 rounded-xl border border-input bg-surface" />
              }
            >
              <CatalogSortSelect className="ml-auto" />
            </Suspense>
          </div>

          {dbError ? (
            <Card>
              <CardHeader>
                <CardTitle>Категория недоступна</CardTitle>
                <CardDescription>{dbError}</CardDescription>
              </CardHeader>
            </Card>
          ) : items.length === 0 ? (
            <CatalogEmptyState
              title="Ничего не нашли"
              description={
                activeFilters
                  ? "Попробуйте изменить фильтры или сбросить их."
                  : "В этой категории пока нет активных товаров — загляните в каталог или другие разделы."
              }
              showCatalogCta
              resetHref={
                activeFilters ? categoryPagePath(slug) : undefined
              }
              resetLabel="Сбросить фильтры"
              popularCategories={popularCategories.map((c) => ({
                name: c.name,
                slug: c.slug,
              }))}
            />
          ) : result ? (
            <InfiniteProductGrid
              key={listKey}
              initialItems={items}
              initialPage={1}
              total={result.total}
              pageSize={CATALOG_PAGE_SIZE}
              query={infiniteQuery}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
