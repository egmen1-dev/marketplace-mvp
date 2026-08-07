import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import {
  HeroSearch,
  HeroShowcase,
  MarketplaceStats,
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
import { ProductCard } from "@/features/products";
import {
  getHomeMarketplaceStats,
  getHomePopularProducts,
  getHomeRootCategories,
} from "@/lib/home/cached-data";
import { APP_NAME, ROUTES } from "@/lib/constants";

/** ISR-friendly homepage data (layout session streams separately). */
export const revalidate = 60;

const sellerBenefits = [
  "Разместить товар за несколько минут",
  "Управление товарами в личном кабинете",
  "Доставка через СДЭК",
] as const;

export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof getHomeRootCategories>> = [];
  let products: Awaited<ReturnType<typeof getHomePopularProducts>>["items"] =
    [];
  let stats: Awaited<ReturnType<typeof getHomeMarketplaceStats>> | null = null;

  try {
    const [cats, productResult, marketplaceStats] = await Promise.all([
      getHomeRootCategories(),
      getHomePopularProducts(),
      getHomeMarketplaceStats(),
    ]);
    categories = cats;
    products = productResult.items;
    stats = marketplaceStats;
  } catch (err) {
    console.error("[home]", err);
  }

  const featured = products[0] ?? null;
  const showStats =
    stats != null &&
    (stats.products > 0 || stats.sellers > 0 || stats.categories > 0);

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
            <p className="font-heading text-sm font-medium tracking-[0.22em] text-primary uppercase">
              {APP_NAME}
            </p>

            {/* No fade-up on LCP text — opacity:0 delays Largest Contentful Paint */}
            <h1 className="max-w-2xl font-heading text-3xl leading-[1.12] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Покупайте и продавайте всё в одном месте
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Товары от магазинов и продавцов — с удобной доставкой СДЭК
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
                size="cta"
                className="rounded-xl"
                nativeButton={false}
                render={<Link href={ROUTES.CATALOG} />}
              >
                Открыть каталог
              </Button>
              <Button
                size="cta"
                variant="outline"
                className="rounded-xl"
                nativeButton={false}
                render={<Link href={ROUTES.SELL} />}
              >
                Продать товар
              </Button>
            </div>
          </div>

          <HeroShowcase featured={featured} />
        </div>
      </section>

      <div className="content-visibility-auto">
        <PopularCategories categories={categories} />
      </div>

      {showStats && stats ? (
        <div className="content-visibility-auto">
          <MarketplaceStats
            products={stats.products}
            sellers={stats.sellers}
            categories={stats.categories}
          />
        </div>
      ) : null}

      <section className="content-visibility-auto border-t border-border bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
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
                <CardTitle>Пока нет товаров</CardTitle>
                <CardDescription>
                  Загляните в{" "}
                  <Link
                    href={ROUTES.CATALOG}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    каталог
                  </Link>{" "}
                  чуть позже — новые предложения появляются каждый день.
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

      <div className="content-visibility-auto">
        <TrustSection />
      </div>

      <section className="content-visibility-auto mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-card to-card ring-primary/20 hover:translate-y-0 hover:shadow-card">
          <CardContent className="grid gap-8 p-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] sm:items-center sm:gap-10 sm:p-8 lg:p-10">
            <div className="max-w-lg">
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                Готовы продавать на {APP_NAME}?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Откройте кабинет продавца и разместите первый товар за минуту.
              </p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {sellerBenefits.map((text) => (
                  <li
                    key={text}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <Button
                size="lg"
                className="rounded-xl sm:min-w-[200px]"
                nativeButton={false}
                render={<Link href={ROUTES.SELLER_NEW_PRODUCT} />}
              >
                Добавить товар
                <ArrowRight data-icon="inline-end" />
              </Button>
              <p className="text-center text-xs text-muted-foreground sm:text-right">
                Нужен кабинет продавца — система направит при входе.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
