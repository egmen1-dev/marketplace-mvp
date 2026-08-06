import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Package,
  Search,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listRootCategories } from "@/features/catalog";
import { categoryPagePath } from "@/features/catalog/paths";
import { listProducts, ProductCard } from "@/features/products";
import { APP_NAME, ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const advantages = [
  {
    icon: Truck,
    title: "Быстрая доставка",
    text: "Отправка через СДЭК в пункты выдачи по всей стране.",
  },
  {
    icon: CreditCard,
    title: "Удобная оплата",
    text: "Безопасная оплата картой — деньги у продавца после сделки.",
  },
  {
    icon: BadgeCheck,
    title: "Проверенные продавцы",
    text: "Кабинеты продавцов и понятный статус товаров на витрине.",
  },
  {
    icon: Package,
    title: "Лёгкий возврат",
    text: "Прозрачные условия и поддержка при спорных ситуациях.",
  },
] as const;

export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof listRootCategories>> = [];
  let products: Awaited<ReturnType<typeof listProducts>>["items"] = [];

  try {
    const [cats, productResult] = await Promise.all([
      listRootCategories({ activeOnly: true }),
      listProducts({ status: "ACTIVE", pageSize: 8, page: 1, sort: "popular" }),
    ]);
    categories = cats.slice(0, 8);
    products = productResult.items;
  } catch (err) {
    console.error("[home]", err);
  }

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

        <div className="relative mx-auto flex min-h-[min(78vh,640px)] max-w-7xl flex-col justify-center gap-7 px-4 py-16 sm:px-6 sm:py-24">
          <p
            className="animate-fade-up font-heading text-sm font-medium tracking-[0.22em] text-primary uppercase"
            style={{ animationDelay: "40ms" }}
          >
            {APP_NAME}
          </p>

          <h1
            className="animate-fade-up max-w-3xl font-heading text-3xl leading-[1.12] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "120ms" }}
          >
            Покупайте и продавайте товары удобно
          </h1>

          <p
            className="animate-fade-up max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            Современный маркетплейс с быстрым поиском, понятной витриной и
            удобной корзиной.
          </p>

          <form
            className="animate-fade-up flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "280ms" }}
            action={ROUTES.CATALOG}
            method="get"
            role="search"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                type="search"
                placeholder="Найти товары, бренды, категории…"
                className="h-12 rounded-xl border-border/80 bg-surface-elevated/90 pl-10 text-base shadow-card backdrop-blur-sm placeholder:text-muted-foreground/80 focus-visible:shadow-glow"
                aria-label="Поиск товаров"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 shrink-0 rounded-xl px-7"
            >
              Найти
            </Button>
          </form>

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
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div
          className="animate-fade-up mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
          style={{ animationDelay: "80ms" }}
        >
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Категории
            </h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Выберите направление и перейдите в каталог.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            nativeButton={false}
            render={<Link href={ROUTES.CATEGORIES} />}
          >
            Все категории
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Категории появятся после seed базы данных.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={categoryPagePath(category.slug)}
                className="animate-fade-up group"
                style={{ animationDelay: `${100 + index * 40}ms` }}
              >
                <div className="flex h-full flex-col gap-3 rounded-2xl bg-card/80 p-3.5 ring-1 ring-border transition-[box-shadow,transform,ring-color] duration-[var(--duration-base)] hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary/35">
                  <div className="flex h-14 items-end rounded-xl bg-gradient-to-t from-primary/25 to-transparent p-2.5">
                    <span className="size-2.5 rounded-full bg-primary transition-transform duration-[var(--duration-base)] group-hover:scale-125" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-medium leading-snug">
                      {category.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {category.productCount} товаров
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

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

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-xl">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Почему {APP_NAME}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Всё нужное для комфортной покупки и продажи в одном месте.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((item, index) => (
            <div
              key={item.title}
              className="animate-fade-up rounded-2xl border border-border bg-card/60 p-5"
              style={{ animationDelay: `${80 + index * 60}ms` }}
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <item.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-heading text-base font-medium">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

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
