import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  brandOrganizationJsonLd,
  brandPagePath,
  breadcrumbJsonLd,
  buildBrandSeo,
  buildRelatedLinks,
  computeSeoScore,
  draftBrandAiSeo,
  getBrandBySlug,
  itemListJsonLd,
  productPagePath,
  productTypePagePath,
  shouldIndexPage,
} from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Бренд не найден" };
  const seo = buildBrandSeo({ name: brand.name, appName: APP_NAME });
  const score = computeSeoScore({
    hasTitle: true,
    hasDescription: true,
    contentLength: 80,
    productCount: brand._count.products,
    internalLinkCount: 3,
    hasUniqueText: true,
    hasFacets: false,
  });
  const origin = getCanonicalAppUrl();
  const index = shouldIndexPage(score, brand._count.products);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `${origin}${brandPagePath(brand.slug)}` },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const origin = getCanonicalAppUrl();
  const seo = buildBrandSeo({ name: brand.name, appName: APP_NAME });
  const draft = draftBrandAiSeo({ name: brand.name, appName: APP_NAME });

  const [result, typeRows] = await Promise.all([
    listProducts({
      brand: brand.slug,
      status: "ACTIVE",
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
      sort: "popular",
    }),
    prisma.product.findMany({
      where: {
        brandId: brand.id,
        status: ProductStatus.ACTIVE,
        productTypeId: { not: null },
      },
      distinct: ["productTypeId"],
      take: 12,
      select: {
        productType: {
          select: {
            id: true,
            name: true,
            lotName: true,
            slug: true,
            category: { select: { path: true, slug: true, name: true } },
          },
        },
      },
    }),
  ]);

  const types = typeRows
    .map((r) => r.productType)
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const score = computeSeoScore({
    hasTitle: true,
    hasDescription: true,
    contentLength: draft.content.length,
    productCount: result.total,
    internalLinkCount: types.length + 1,
    hasUniqueText: true,
    hasFacets: false,
  });

  const pageUrl = `${origin}${brandPagePath(brand.slug)}`;
  const related = buildRelatedLinks({
    productTypes: types.map((t) => ({
      href: productTypePagePath(t.category.path ?? t.category.slug, t.slug),
      label: t.lotName ?? t.name,
    })),
    products: result.items.slice(0, 6).map((p) => ({
      href: productPagePath(p.id),
      label: p.title,
    })),
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        data={[
          brandOrganizationJsonLd({
            name: brand.name,
            url: pageUrl,
            description: seo.description,
          }),
          itemListJsonLd({
            name: brand.name,
            url: pageUrl,
            items: result.items.slice(0, 20).map((p) => ({
              name: p.title,
              url: `${origin}${productPagePath(p.id)}`,
            })),
          }),
          breadcrumbJsonLd([
            { name: "Бренды", url: `${origin}${ROUTES.BRANDS}` },
            { name: brand.name, url: pageUrl },
          ]),
        ]}
      />

      <CatalogBreadcrumbs
        items={[
          { label: "Бренды", href: ROUTES.BRANDS },
          { label: brand.name },
        ]}
      />

      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {seo.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="seo-brand-count">
          {result.total} {pluralizeProductWord(result.total)}
          <span className="ml-2 text-xs">SEO score {score}</span>
        </p>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{draft.content}</p>
      </div>

      {types.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-semibold">Категории и типы</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {types.map((t) => (
              <Link
                key={t.id}
                href={productTypePagePath(
                  t.category.path ?? t.category.slug,
                  t.slug,
                )}
                className="rounded-xl bg-surface px-3 py-1.5 text-sm ring-1 ring-border hover:text-primary"
              >
                {t.lotName ?? t.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SeoRelatedLinks links={related} />

      <h2 className="font-heading text-lg font-semibold">Товары {brand.name}</h2>
      <InfiniteProductGrid
        key={brand.id}
        initialItems={result.items}
        initialPage={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={{ brand: brand.slug, sort: "popular" }}
      />
    </div>
  );
}
