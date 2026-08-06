import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  HeroSearch,
  HeroShowcase,
  PopularCategories,
  TrustSection,
} from "@/components/home";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listRootCategories } from "@/features/catalog";
import { listProducts, ProductCard } from "@/features/products";
import { APP_NAME, ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof listRootCategories>> = [];
  let products: Awaited<ReturnType<typeof listProducts>>["items"] = [];

  try {
    const [cats, productResult] = await Promise.all([
      listRootCategories({ activeOnly: true }),
      listProducts({ status: "ACTIVE", pageSize: 8, page: 1, sort: "popular" }),
    ]);
    categories = cats;
    products = productResult.items;
  } catch (err) {
    console.error("[home]", err);
  }

  const featured = products[0] ?? null;

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="animate-hero-glow pointer-events-none absolute -top-28 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgb(255_106_0_/_30%),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_35%,var(--background)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:56px_56px]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12 lg:py-24">
          <div className="flex flex-col gap-6 sm:gap-7">
            <p
              className="animate-fade-up font-heading text-sm font-medium tracking-[0.22em] text-primary uppercase"
              style={{ animationDelay: "40ms" }}
            >
              {APP_NAME}
            </p>

            <h1
              className="animate-fade-up max-w-2xl font-heading text-3xl leading-[1.12] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]"
              style={{ animationDelay: "120ms" }}
            >
              Покупайте и продавайте всё в одном месте
            </h1>

            <p
              className="animate-fade-up max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "200ms" }}
            >
              Тысячи товаров от магазинов и продавцов с удобной доставкой
            </p>

            <div
              className="animate-fade-up w-full max-w-2xl"
              style={{ animationDelay: "280ms" }}
            >
              <HeroSearch />
            </div>

            <div
              className="animate-fade-up flex flex-wrap gap-2"
              style={{ animationDelay: "360ms" }}
            >
              <Button
                size="sm"
                className="rounded-xl"
                nativeButton={false}
                render={<Link href={ROUTES.CATALOG} />}
              >
                Открыть каталог
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                nativeButton={false}
                render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
              >
                Продать товар
              </Button>
            </div>
          </div>

          <HeroShowcase featured={featured} />
        </div>
      </section>

      <PopularCategories categories={categories} />

      <section className="border-t border-border bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Популярные товары
              </h2>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Актуальные предложения из каталога.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit rounded-xl"
              nativeButton={false}
              render={<Link href={ROUTES.CATALOG} />}
            >
              Смотреть каталог
            </Button>
          </div>

          {products.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Пока пусто</CardTitle>
                <CardDescription>
                  Запустите{" "}
                  <code className="text-xs">npx prisma migrate dev</code> и{" "}
                  <code className="text-xs">npm run db:seed</code>, либо{" "}
                  <Link
                    href={ROUTES.SELLER_NEW_PRODUCT}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    добавьте товар
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  style={{ animationDelay: `${80 + index * 50}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <TrustSection />

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-card to-card ring-primary/20 hover:translate-y-0 hover:shadow-card">
          <CardContent className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="max-w-lg">
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                Готовы продавать на {APP_NAME}?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Откройте кабинет продавца и разместите первый товар за минуту.
              </p>
            </div>
            <Button
              size="lg"
              className="shrink-0 rounded-xl"
              nativeButton={false}
              render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
            >
              Добавить товар
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
