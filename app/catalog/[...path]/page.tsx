import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CatalogBreadcrumbs } from "@/features/catalog/components/catalog-breadcrumbs";
import { InfiniteProductGrid } from "@/features/catalog/components/infinite-product-grid";
import { CATALOG_PAGE_SIZE } from "@/features/catalog/url";
import { listProducts } from "@/features/products";
import { JsonLd } from "@/features/seo/components/json-ld";
import { SeoRelatedLinks } from "@/features/seo/components/seo-related-links";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { pluralizeProductWord } from "@/lib/i18n";
import {
  brandPagePath,
  breadcrumbJsonLd,
  buildProductTypeSeo,
  buildRelatedLinks,
  categoryPagePath,
  collectionPageJsonLd,
  computeSeoScore,
  draftProductTypeAiSeo,
  getCategoryByPath,
  getProductTypeBySeoPath,
  itemListJsonLd,
  listBrandsForProductType,
  productPagePath,
  productTypePagePath,
  shouldIndexPage,
} from "@/lib/seo";

type Props = {
  params: Promise<{ path: string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const origin = getCanonicalAppUrl();
  const type = await getProductTypeBySeoPath(path);
  if (type) {
    const name = type.lotName ?? type.name;
    const seo = buildProductTypeSeo({ name, appName: APP_NAME });
    const score = computeSeoScore({
      hasTitle: true,
      hasDescription: true,
      contentLength: 120,
      productCount: type._count.products,
      internalLinkCount: 4,
      hasUniqueText: true,
      hasFacets: type.characteristics.length > 0,
    });
    const index = shouldIndexPage(score, type._count.products);
    const canonical = `${origin}${productTypePagePath(type.category.path ?? type.category.slug, type.slug)}`;
    return {
      title: seo.title,
      description: seo.description,
      alternates: { canonical },
      robots: index ? { index: true, follow: true } : { index: false, follow: true },
      openGraph: { title: `${seo.title} · ${APP_NAME}`, description: seo.description },
    };
  }

  const cat = await getCategoryByPath(path.join("/"));
  if (cat) {
    return {
      title: cat.name,
      alternates: {
        canonical: `${origin}${categoryPagePath(cat.slug)}`,
      },
    };
  }
  return { title: "Каталог" };
}

export default async function CatalogPathPage({ params }: Props) {
  const { path } = await params;
  const origin = getCanonicalAppUrl();

  // Category path alias → canonical /category/[slug]
  const cat = await getCategoryByPath(path.join("/"));
  if (cat && path.length >= 1) {
    const type = await getProductTypeBySeoPath(path);
    if (!type) {
      redirect(categoryPagePath(cat.slug));
    }
  }

  const type = await getProductTypeBySeoPath(path);
  if (!type || !type.category.path) notFound();

  const name = type.lotName ?? type.name;
  const seo = buildProductTypeSeo({ name, appName: APP_NAME });
  const draft = draftProductTypeAiSeo({ name, appName: APP_NAME });

  const [result, brands] = await Promise.all([
    listProducts({
      productTypeId: type.id,
      status: "ACTIVE",
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
      sort: "popular",
    }),
    listBrandsForProductType(type.id, 8),
  ]);

  const score = computeSeoScore({
    hasTitle: true,
    hasDescription: true,
    contentLength: draft.content.length,
    productCount: result.total,
    internalLinkCount: brands.length + 2,
    hasUniqueText: true,
    hasFacets: type.characteristics.length > 0,
  });

  const pagePath = productTypePagePath(type.category.path, type.slug);
  const pageUrl = `${origin}${pagePath}`;

  const related = buildRelatedLinks({
    subcategories: [
      {
        href: categoryPagePath(type.category.slug),
        label: type.category.name,
      },
    ],
    brands: brands.map((b) => ({
      href: brandPagePath(b.slug),
      label: b.name,
    })),
    products: result.items.slice(0, 6).map((p) => ({
      href: productPagePath(p.id),
      label: p.title,
    })),
  });

  const crumbs = [
    { label: "Каталог", href: ROUTES.CATALOG },
    { label: type.category.name, href: categoryPagePath(type.category.slug) },
    { label: name },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        data={[
          collectionPageJsonLd({
            name: seo.h1,
            description: seo.description,
            url: pageUrl,
          }),
          itemListJsonLd({
            name,
            url: pageUrl,
            items: result.items.slice(0, 20).map((p) => ({
              name: p.title,
              url: `${origin}${productPagePath(p.id)}`,
            })),
          }),
          breadcrumbJsonLd(
            crumbs
              .filter((c) => c.href)
              .map((c) => ({
                name: c.label,
                url: `${origin}${c.href}`,
              })),
          ),
        ]}
      />

      <CatalogBreadcrumbs items={crumbs} />

      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {seo.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="seo-product-type-count">
          {result.total} {pluralizeProductWord(result.total)}
          <span className="ml-2 text-xs">SEO score {score}</span>
        </p>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          {draft.content}
        </p>
      </div>

      {type.characteristics.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-semibold">Характеристики</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {type.characteristics.map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-surface px-2.5 py-1 ring-1 ring-border"
              >
                {c.name}
                {c.unit ? ` (${c.unit})` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brands.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-semibold">Популярные бренды</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={brandPagePath(b.slug)}
                className="rounded-xl bg-surface px-3 py-1.5 text-sm ring-1 ring-border hover:text-primary"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SeoRelatedLinks links={related} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">Товары</h2>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`${ROUTES.CATALOG}?productType=${type.slug}`} />}
        >
          Все фильтры
        </Button>
      </div>

      <InfiniteProductGrid
        key={type.id}
        initialItems={result.items}
        initialPage={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={{ productType: type.slug, sort: "popular" }}
      />
    </div>
  );
}
