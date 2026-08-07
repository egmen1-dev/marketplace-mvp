import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/features/auth";
import { recordProductView } from "@/features/account";
import {
  formatCondition,
  formatPrice,
  getProductById,
  incrementProductViews,
  listSimilarProducts,
  ProductGallery,
  ProductPurchasePanel,
  SimilarProducts,
} from "@/features/products";
import { ProductSellerCard } from "@/features/seller/components/product-seller-card";
import { getSellerTrustProfile } from "@/features/seller/lib/reputation";
import { categoryPagePath } from "@/features/catalog/paths";
import { ComingSoonButton } from "@/components/layout/coming-soon-button";
import { APP_NAME, ROUTES } from "@/lib/constants";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

async function loadProductForPage(id: string) {
  const session = await getSessionUser();
  const product = await getProductById(
    id,
    session
      ? {
          userId: session.id,
          role: session.role,
          sellerProfileId: session.sellerProfileId,
        }
      : null,
  );
  return { product, session };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { product } = await loadProductForPage(id);
    if (!product) return { title: "Товар не найден" };
    const description =
      product.description?.slice(0, 160) ||
      `${product.title} — ${formatPrice(product.price, product.currency)} на ${APP_NAME}`;
    const image = product.primaryImage?.url ?? product.images[0]?.url;
    return {
      title: product.title,
      description,
      openGraph: {
        title: `${product.title} · ${APP_NAME}`,
        description,
        type: "website",
        ...(image ? { images: [{ url: image }] } : {}),
      },
    };
  } catch {
    return { title: "Товар" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  let product: Awaited<ReturnType<typeof getProductById>> = null;
  let session: Awaited<ReturnType<typeof getSessionUser>> = null;
  let similar: Awaited<ReturnType<typeof listSimilarProducts>> = [];
  let sellerTrust: Awaited<ReturnType<typeof getSellerTrustProfile>> = null;
  try {
    const loaded = await loadProductForPage(id);
    product = loaded.product;
    session = loaded.session;
    if (product) {
      [similar, sellerTrust] = await Promise.all([
        listSimilarProducts(product.id, {
          categoryId: product.category?.id,
          limit: 8,
        }),
        getSellerTrustProfile(product.seller.slug),
      ]);
    }
  } catch (err) {
    console.error("[product]", err);
  }

  if (!product) notFound();

  // Fire-and-forget popularity counter (ACTIVE PDP views).
  if (product.status === "ACTIVE") {
    incrementProductViews(product.id);
    if (session) {
      void recordProductView(session.id, product.id).catch((err) => {
        console.error("[recordProductView]", err);
      });
    }
  }

  const showOldPrice =
    product.compareAt != null && product.compareAt > product.price;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Button
        variant="ghost"
        size="sm"
        className="mb-5 text-muted-foreground"
        nativeButton={false}
        render={<Link href={ROUTES.CATALOG} />}
      >
        <ArrowLeft data-icon="inline-start" />
        В каталог
      </Button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <ProductGallery images={product.images} title={product.title} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <Badge
                  variant="secondary"
                  className="w-fit"
                  render={
                    <Link
                      href={categoryPagePath(product.category.slug)}
                    />
                  }
                >
                  {product.category.name}
                </Badge>
              ) : null}
              <span
                className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                title="Демо-рейтинг для витрины"
              >
                <Star className="size-3.5 fill-primary text-primary" />
                <span className="font-medium text-foreground tabular-nums">
                  4.8
                </span>
              </span>
            </div>

            <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              {product.title}
            </h1>

            <div className="flex flex-wrap items-baseline gap-3">
              <p className="font-heading text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                {formatPrice(product.price, product.currency)}
              </p>
              {showOldPrice ? (
                <p className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compareAt!, product.currency)}
                </p>
              ) : null}
            </div>

            {product.city ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {product.city}
              </p>
            ) : null}
          </div>

          <ProductPurchasePanel
            productId={product.id}
            stock={product.stock}
          />

          {sellerTrust ? (
            <ProductSellerCard seller={sellerTrust} />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoChip
              icon={<Truck className="size-4" />}
              title="Доставка"
              text="СДЭК · пункты выдачи"
            />
            <InfoChip
              icon={<ShieldCheck className="size-4" />}
              title="Гарантия"
              text="Безопасная сделка"
            />
            <InfoChip
              icon={<Package className="size-4" />}
              title="Возврат"
              text="14 дней на возврат"
            />
          </div>
        </div>
      </div>

      <Separator className="my-10 sm:my-14" />

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Описание
          </h2>
          {product.description ? (
            <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {product.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Продавец пока не добавил описание.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Характеристики
          </h2>
          <dl className="divide-y divide-border rounded-2xl border border-border bg-card/50">
            <SpecRow label="Состояние" value={formatCondition(product.condition)} />
            {product.sku ? (
              <SpecRow label="Артикул" value={product.sku} />
            ) : null}
            {product.city ? (
              <SpecRow label="Город" value={product.city} />
            ) : null}
            {product.category ? (
              <SpecRow label="Категория" value={product.category.name} />
            ) : null}
            <SpecRow
              label="Наличие"
              value={
                product.stock > 0 ? `${product.stock} шт.` : "Нет в наличии"
              }
            />
          </dl>
        </section>
      </div>

      <section className="mt-10 sm:mt-14">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Отзывы
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
          <Star className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 font-heading text-base font-medium">
            Отзывы скоро появятся
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Покупатели смогут делиться впечатлениями после заказа.
          </p>
          <ComingSoonButton
            label="Написать отзыв"
            size="sm"
            className="mt-4"
          />
        </div>
      </section>

      <SimilarProducts products={similar} />
    </div>
  );
}

function InfoChip({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card/40 p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-3 px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
