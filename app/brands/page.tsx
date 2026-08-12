import type { Metadata } from "next";
import Link from "next/link";

import { CatalogBreadcrumbs } from "@/features/catalog/components/catalog-breadcrumbs";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { brandPagePath, listActiveBrands } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Бренды — каталог ${APP_NAME}`,
  description: `Все бренды товаров на ${APP_NAME}. Выбирайте производителя и модели.`,
};

export const dynamic = "force-dynamic";

export default async function BrandsIndexPage() {
  const brands = await listActiveBrands(200);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <CatalogBreadcrumbs
        items={[
          { label: "Каталог", href: ROUTES.CATALOG },
          { label: "Бренды" },
        ]}
      />
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Бренды
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {brands.length} брендов с активными товарами
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {brands.map((b) => (
          <li key={b.id}>
            <Link
              href={brandPagePath(b.slug)}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-primary/40"
              data-testid="brand-index-link"
            >
              <span className="font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground">
                {b._count.products}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
