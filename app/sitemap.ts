import type { MetadataRoute } from "next";
import { ProductStatus } from "@prisma/client";

import { ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  brandPagePath,
  listIndexableSeoPages,
  listProductTypesForSitemap,
  productTypePagePath,
  SEO_INDEX_THRESHOLD,
} from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getCanonicalAppUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${origin}${ROUTES.HOME}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}${ROUTES.CATALOG}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${origin}${ROUTES.CATEGORIES}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${origin}${ROUTES.BRANDS}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    },
  ];

  try {
    const [categories, products, productTypes, brands, seoPages] =
      await Promise.all([
        prisma.category.findMany({
          where: {
            isActive: true,
            OR: [
              { products: { some: { status: ProductStatus.ACTIVE } } },
              {
                productTypes: {
                  some: {
                    products: { some: { status: ProductStatus.ACTIVE } },
                  },
                },
              },
            ],
          },
          select: { slug: true, updatedAt: true },
        }),
        prisma.product.findMany({
          where: { status: ProductStatus.ACTIVE },
          select: { id: true, updatedAt: true },
          take: 5_000,
          orderBy: { updatedAt: "desc" },
        }),
        listProductTypesForSitemap(2_000),
        prisma.brand.findMany({
          where: {
            isActive: true,
            products: { some: { status: ProductStatus.ACTIVE } },
          },
          select: { slug: true, updatedAt: true },
          take: 1_000,
        }),
        listIndexableSeoPages(500),
      ]);

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${origin}${ROUTES.CATEGORY}/${encodeURIComponent(c.slug)}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const productTypeEntries: MetadataRoute.Sitemap = productTypes
      .filter((t) => t._count.products > 0 && t.category.path)
      .map((t) => ({
        url: `${origin}${productTypePagePath(t.category.path!, t.slug)}`,
        lastModified: t.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.72,
      }));

    const brandEntries: MetadataRoute.Sitemap = brands.map((b) => ({
      url: `${origin}${brandPagePath(b.slug)}`,
      lastModified: b.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));

    const facetEntries: MetadataRoute.Sitemap = seoPages
      .filter((p) => p.score >= SEO_INDEX_THRESHOLD)
      .map((p) => ({
        url: `${origin}${p.path}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      }));

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${origin}${ROUTES.PRODUCT}/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [
      ...staticEntries,
      ...categoryEntries,
      ...productTypeEntries,
      ...brandEntries,
      ...facetEntries,
      ...productEntries,
    ];
  } catch (err) {
    console.error("[sitemap]", err);
    return staticEntries;
  }
}
