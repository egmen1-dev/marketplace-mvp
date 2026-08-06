import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CatalogBreadcrumbs } from "@/features/catalog/components/catalog-breadcrumbs";
import {
  CatalogFiltersMobile,
  CatalogFiltersSidebar,
  CatalogSortSelect,
} from "@/features/catalog/components/catalog-filters";
import {
  categoryPagePath,
  getCategoryBySlug,
  listCategoryTree,
} from "@/features/catalog";
import type { CatalogSearchParams } from "@/features/catalog/types";
import {
  buildCatalogHref,
  CATALOG_PAGE_SIZE,
  hasActiveCatalogFilters,
  parseCatalogParams,
} from "@/features/catalog/url";
import {
  listProductCities,
  listProductSellers,
  listProducts,
  ProductCard,
} from "@/features/products";
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
  let dbError: string | null = null;

  try {
    const [tree, cityList, sellerList, productResult, categoryDetail] =
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
          sort: filters.sort,
          page: filters.page,
          pageSize: CATALOG_PAGE_SIZE,
          status: "ACTIVE",
        }),
        filters.category
          ? getCategoryBySlug(filters.category, { activeOnly: true })
          : Promise.resolve(null),
      ]);
    categoryTree = tree;
    cities = cityList;
    sellers = sellerList;
    result = productResult;
    activeCategory = categoryDetail;
  } catch (err) {
    console.error("[catalog]", err);
    dbError = "Не удалось загрузить каталог. Проверьте подключение к БД.";
  }

  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 1;
  const page = filters.page ?? 1;
  const activeFilters = hasActiveCatalogFilters(filters);

  const pageHref = (nextPage: number) =>
    buildCatalogHref({
      q: filters.q,
      category: filters.rootCategory ?? filters.category,
      subcategory: filters.subcategory,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      city: filters.city,
      seller: filters.seller,
      sellerKind: filters.sellerKind,
      condition: filters.condition,
      inStock: filters.inStock,
      sort: filters.sort,
      page: nextPage,
    });

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
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
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {result
              ? `${result.total} товар${plural(result.total)}`
              : "Витрина маркетплейса"}
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
            <Card>
              <CardHeader>
                <CardTitle>Ничего не найдено</CardTitle>
                <CardDescription>
                  {activeFilters ? (
                    <>
                      Попробуйте изменить фильтры или{" "}
                      <Link
                        href={ROUTES.CATALOG}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        сбросить все
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      В каталоге пока пусто —{" "}
                      <Link
                        href={ROUTES.SELLER_NEW_PRODUCT}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        добавьте первый товар
                      </Link>
                      .
                    </>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  style={{ animationDelay: `${80 + index * 40}ms` }}
                />
              ))}
            </div>
          )}

          {result && totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              {page > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={pageHref(page - 1)} />}
                >
                  Назад
                </Button>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={pageHref(page + 1)} />}
                >
                  Далее
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function plural(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "а";
  return "ов";
}
