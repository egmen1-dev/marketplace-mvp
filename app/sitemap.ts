import type { MetadataRoute } from "next";
import { ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

function siteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (fromEnv) {
    const raw = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return raw.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
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
