import type { MetadataRoute } from "next";
import { ProductStatus } from "@prisma/client";

import { ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

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
  ];

  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        select: { id: true, updatedAt: true },
        take: 5_000,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${origin}${ROUTES.CATEGORY}/${encodeURIComponent(c.slug)}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${origin}${ROUTES.PRODUCT}/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticEntries, ...categoryEntries, ...productEntries];
  } catch (err) {
    console.error("[sitemap]", err);
    return staticEntries;
  }
}
