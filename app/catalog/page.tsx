import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FunnelTracker } from "@/components/analytics";
import { TrustStrip } from "@/components/trust";
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
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { APP_NAME, ROUTES } from "@/lib/constants";

type CatalogPageProps = {
  searchParams: Promise<CatalogSearchParams>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Каталог",
  description: `Каталог товаров ${APP_NAME}: поиск, фильтры по категории, цене, городу и состоянию.`,
  openGraph: {
    title: `Каталог · ${APP_NAME}`,
    description: "Витрина маркетплейса с фильтрами и сортировкой.",
  },
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const raw = await searchParams;
  const filters = parseCatalogParams(raw);

  let categoryTree: Awaited<ReturnType<typeof listCategoryTree>> = [];
  let cities: string[] = [];
  let sellers: Awaited<ReturnType<typeof listProductSellers>> = [];
  let result: Awaited<ReturnType<typeof listProducts>> | null = null;
  let activeCategory: Awaited<ReturnType<typeof getCategoryBySlug>> = null;
  let popularCategories: Awaited<ReturnType<typeof listRootCategories>> = [];
  let dbError: string | null = null;

  try {
    const [tree, cityList, sellerList, productResult, categoryDetail, roots] =
      await Promise.all([
        listCategoryTree({ activeOnly: true }),
        listProductCities(),
        listProductSellers(),
        listProducts({
          category: filters.category,
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
        filters.category
          ? getCategoryBySlug(filters.category, { activeOnly: true })
          : Promise.resolve(null),
        listRootCategories({ activeOnly: true }),
      ]);
    categoryTree = tree;
    cities = cityList;
    sellers = sellerList;
    result = productResult;
    activeCategory = categoryDetail;
    popularCategories = roots
      .filter((c) => c.productCount > 0)
      .slice(0, 6);
  } catch (err) {
    console.error("[catalog]", err);
    dbError = "Не удалось загрузить каталог. Попробуйте обновить страницу.";
  }

  const items = result?.items ?? [];
  const activeFilters = hasActiveCatalogFilters(filters);

  const title = activeCategory?.name ?? "Каталог";
  const breadcrumbItems = [
    { label: "Каталог", href: activeCategory ? ROUTES.CATALOG : undefined },
    ...(activeCategory?.ancestors.map((a) => ({
      label: a.name,
      href: categoryPagePath(a.slug),
    })) ?? []),
    ...(activeCategory
      ? [{ label: activeCategory.name, href: categoryPagePath(activeCategory.slug) }]
      : []),
  ];

  const resultLabel =
    result != null
      ? filters.q || activeFilters
        ? `Найдено ${result.total} ${pluralizeProductWord(result.total)}`
        : `${result.total} ${pluralizeProductWord(result.total)}`
      : "Витрина маркетплейса";

  const infiniteQuery = {
    q: filters.q,
    category: filters.category,
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
      <TrustStrip blockId="catalog" route="/catalog" className="-mx-4 rounded-none border-x-0 sm:-mx-6" />
      <CatalogBreadcrumbs
        items={
          breadcrumbItems.length > 0
            ? breadcrumbItems
            : [{ label: "Каталог" }]
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p
            className="mt-1 text-sm text-muted-foreground sm:text-base"
            data-testid="catalog-result-count"
          >
            {resultLabel}
            {filters.q ? ` · «${filters.q}»` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded-xl"
            nativeButton={false}
            render={<Link href={ROUTES.CATEGORIES} />}
          >
            Категории
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded-xl"
            nativeButton={false}
            render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
          >
            Добавить товар
          </Button>
        </div>
      </div>

      <div className="flex gap-8">
        <Suspense fallback={null}>
          <CatalogFiltersSidebar
            categoryTree={categoryTree}
            cities={cities}
            sellers={sellers}
          />
        </Suspense>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Suspense fallback={null}>
              <CatalogFiltersMobile
                categoryTree={categoryTree}
                cities={cities}
                sellers={sellers}
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
                <CardTitle>Каталог недоступен</CardTitle>
                <CardDescription>{dbError}</CardDescription>
              </CardHeader>
            </Card>
          ) : items.length === 0 ? (
            <CatalogEmptyState
              title="Ничего не нашли"
              description={
                activeFilters
                  ? "Попробуйте изменить фильтры или запрос — либо сбросьте все параметры."
                  : "В каталоге пока нет товаров. Загляните в популярные категории чуть позже."
              }
              showCatalogCta
              resetHref={activeFilters ? ROUTES.CATALOG : undefined}
              resetLabel="Сбросить все"
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
      <FunnelTracker
        event={ANALYTICS_EVENTS.CATEGORY_VIEW}
        route="/catalog"
        entityId={activeCategory?.slug ?? filters.category ?? undefined}
      />
    </div>
  );
}
