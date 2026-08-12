import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InfiniteProductGrid } from "@/features/catalog/components/infinite-product-grid";
import { CatalogBreadcrumbs } from "@/features/catalog/components/catalog-breadcrumbs";
import { CATALOG_PAGE_SIZE } from "@/features/catalog/url";
import { listProducts } from "@/features/products";
import { JsonLd } from "@/features/seo/components/json-ld";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { pluralizeProductWord } from "@/lib/i18n";
import {
  collectionPageJsonLd,
  computeSeoScore,
  getSeoPageByPath,
  renderSeoTemplate,
  SEO_TEMPLATES,
  shouldIndexPage,
} from "@/lib/seo";

type Props = {
  params: Promise<{ productType: string; value: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productType, value } = await params;
  const path = `/catalog/seo/${productType}/${value}`;
  const page = await getSeoPageByPath(path);
  if (!page || page.status !== "APPROVED") {
    return { title: "Страница", robots: { index: false, follow: true } };
  }
  const origin = getCanonicalAppUrl();
  const index = page.indexable && shouldIndexPage(page.score, 1);
  return {
    title: page.title ?? "Подборка",
    description: page.description ?? undefined,
    alternates: { canonical: `${origin}${page.path}` },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

/**
 * Controlled facet SEO landing — only when SeoPage is APPROVED.
 * Mass combinations are NOT generated.
 */
export default async function ControlledFacetSeoPage({ params }: Props) {
  const { productType, value } = await params;
  const path = `/catalog/seo/${productType}/${value}`;
  const page = await getSeoPageByPath(path);
  if (!page || page.status === "DISABLED" || page.status === "DRAFT") {
    notFound();
  }
  if (page.status !== "APPROVED" && page.status !== "PENDING_REVIEW") {
    notFound();
  }
  // PENDING_REVIEW is viewable by... actually public should only see APPROVED
  if (page.status !== "APPROVED") notFound();

  const origin = getCanonicalAppUrl();
  const meta = (page.meta ?? {}) as {
    facetSlug?: string;
    facetValue?: string;
  };

  const result = await listProducts({
    productType,
    facets:
      meta.facetSlug && meta.facetValue
        ? [{ slug: meta.facetSlug, value: meta.facetValue }]
        : undefined,
    status: "ACTIVE",
    page: 1,
    pageSize: CATALOG_PAGE_SIZE,
  });

  const score =
    page.score ||
    computeSeoScore({
      hasTitle: Boolean(page.title),
      hasDescription: Boolean(page.description),
      contentLength: (page.content ?? "").length,
      productCount: result.total,
      internalLinkCount: 2,
      hasUniqueText: Boolean(page.content),
      hasFacets: true,
    });

  if (result.total === 0) notFound();

  const title =
    page.title ||
    renderSeoTemplate(SEO_TEMPLATES.facet.title, {
      ProductType: productType,
      FacetValue: value,
      AppName: APP_NAME,
    });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <JsonLd
        data={collectionPageJsonLd({
          name: title,
          description: page.description ?? title,
          url: `${origin}${page.path}`,
        })}
      />
      <CatalogBreadcrumbs
        items={[
          { label: "Каталог", href: ROUTES.CATALOG },
          { label: title },
        ]}
      />
      <div>
        <h1 className="font-heading text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total} {pluralizeProductWord(result.total)} · score {score}
        </p>
        {page.content ? (
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            {page.content}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Контролируемая SEO-посадка ·{" "}
          <Link href={`${ROUTES.CATALOG}?productType=${productType}`}>
            открыть в каталоге
          </Link>
        </p>
      </div>
      <InfiniteProductGrid
        initialItems={result.items}
        initialPage={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={{
          productType,
          facets:
            meta.facetSlug && meta.facetValue
              ? [{ slug: meta.facetSlug, value: meta.facetValue }]
              : undefined,
          sort: "popular",
        }}
      />
    </div>
  );
}
