import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/features/products/components/product-card";
import { getPublicSellerProfile } from "@/features/seller/queries";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await getPublicSellerProfile(id);
  if (!data) return { title: "Продавец" };
  return {
    title: `${data.profile.storeName} · ${APP_NAME}`,
    description: data.profile.description ?? undefined,
  };
}

export default async function PublicSellerPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPublicSellerProfile(id);
  if (!data) notFound();

  const { profile, products } = data;
  const joined = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(profile.joinedAt));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-elevated">
          {profile.logoUrl ? (
            <Image
              src={profile.logoUrl}
              alt={profile.storeName}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 via-muted to-surface">
              <Store className="size-10 text-primary" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {profile.storeName}
            </h1>
            {profile.isVerified ? (
              <Badge variant="secondary">Проверен</Badge>
            ) : null}
          </div>
          {profile.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {profile.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Рейтинг{" "}
              <span className="tabular-nums text-foreground">
                {profile.rating.toFixed(1)}
              </span>
            </span>
            <span>
              Товаров{" "}
              <span className="tabular-nums text-foreground">
                {profile.productCount}
              </span>
            </span>
            <span>На площадке с {joined}</span>
          </div>
          {profile.shippingDefaults ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Доставка: {profile.shippingDefaults}
            </p>
          ) : null}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Отзывы</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Отзывы о продавце появятся позже.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold">Товары</h2>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока нет активных товаров.{" "}
            <Link href="/catalog" className="text-primary underline-offset-4 hover:underline">
              В каталог
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
