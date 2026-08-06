import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CatalogBreadcrumbs } from "@/features/catalog/components/catalog-breadcrumbs";
import {
  categoryPagePath,
  listRootCategories,
} from "@/features/catalog";
import { APP_NAME, ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Категории",
  description: `Все категории товаров на ${APP_NAME}: строительство, дом, электроника, авто, одежда и другие.`,
  openGraph: {
    title: `Категории · ${APP_NAME}`,
    description: "Выберите категорию и перейдите в каталог.",
  },
};

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof listRootCategories>> = [];
  let dbError: string | null = null;

  try {
    categories = await listRootCategories({ activeOnly: true });
  } catch (err) {
    console.error("[categories]", err);
    dbError = "Не удалось загрузить категории.";
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <CatalogBreadcrumbs items={[{ label: "Категории" }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Категории
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Выберите направление — откроется страница категории с товарами.
          </p>
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

      {dbError ? (
        <Card>
          <CardHeader>
            <CardTitle>Категории недоступны</CardTitle>
            <CardDescription>{dbError}</CardDescription>
          </CardHeader>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Пока пусто</CardTitle>
            <CardDescription>
              Категории появятся после seed базы данных.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={categoryPagePath(category.slug)}
              className="group animate-fade-up"
              style={{ animationDelay: `${60 + index * 40}ms` }}
            >
              <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-[box-shadow,transform,ring-color] duration-[var(--duration-base)] hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary/35">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
                  <h2 className="font-heading text-base font-semibold tracking-tight sm:text-lg">
                    {category.name}
                  </h2>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {category.productCount}{" "}
                    {productCountLabel(category.productCount)}
                  </p>
                  {category.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  ) : null}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function productCountLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "товара";
  return "товаров";
}
