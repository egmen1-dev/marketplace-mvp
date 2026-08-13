import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin, Package, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FunnelTracker } from "@/components/analytics";
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
import { PdpCharacteristics } from "@/features/products/components/pdp-characteristics";
import { PdpSectionViewTracker } from "@/features/products/components/pdp-section-view-tracker";
import { PdpTrustBlock } from "@/features/products/components/pdp-trust-block";
import { PdpWhyBuyBlock } from "@/features/products/components/pdp-why-buy-block";
import { BuyerProductFitBlock } from "@/features/buyer-intelligence";
import {
  BuyerEducationPanel,
  BuyerSmartAssistant,
} from "@/features/marketplace-education";
import {
  getBuyerEducationTopics,
  getBuyerHelpPrompts,
  isMarketplaceEducationEnabled,
} from "@/lib/marketplace-education";
import {
  getProductBuyerMatch,
  isBuyerIntelligenceEnabled,
} from "@/lib/buyer-intelligence";
import { PromotedBadge } from "@/features/promotion";
import { getSellerTrustProfile } from "@/features/seller/lib/reputation";
import { categoryPagePath } from "@/features/catalog/paths";
import { getReservationAvailability } from "@/features/pickup/lib/reservation-availability";
import { JsonLd } from "@/features/seo/components/json-ld";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getCanonicalAppUrl } from "@/lib/env";
import { isProductPromoted } from "@/lib/promotion";
import { productJsonLd } from "@/lib/seo/json-ld";
import { brandPagePath } from "@/lib/seo/paths";

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
    const { getCanonicalAppUrl } = await import("@/lib/env");
    const { productPagePath } = await import("@/lib/seo");
    const title = product.seoTitle?.trim() || product.title;
    const description =
      product.seoDescription?.trim() ||
      product.description?.slice(0, 160) ||
      `${product.title} — ${formatPrice(product.price, product.currency)} на ${APP_NAME}`;
    const image = product.primaryImage?.url ?? product.images[0]?.url;
    const origin = getCanonicalAppUrl();
    const canonical = `${origin}${productPagePath(product.id)}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} · ${APP_NAME}`,
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
  let promoted = false;
  let buyerMatch: Awaited<ReturnType<typeof getProductBuyerMatch>> = null;
  const educationEnabled = isMarketplaceEducationEnabled();
  const buyerEducationTopics = educationEnabled ? getBuyerEducationTopics() : [];
  let buyerHelpPrompts: ReturnType<typeof getBuyerHelpPrompts> = [];
  try {
    const loaded = await loadProductForPage(id);
    product = loaded.product;
    session = loaded.session;
    if (product) {
      [similar, sellerTrust, promoted] = await Promise.all([
        listSimilarProducts(product.id, {
          categoryId: product.category?.id,
          price: product.price,
          limit: 8,
        }),
        getSellerTrustProfile(product.seller.slug),
        isProductPromoted(product.id),
      ]);
      if (isBuyerIntelligenceEnabled()) {
        buyerMatch = await getProductBuyerMatch({
          productId: product.id,
          userId: session?.id ?? null,
        });
      }
    }
  } catch (err) {
    console.error("[product]", err);
  }

  if (!product) notFound();

  if (educationEnabled) {
    buyerHelpPrompts = getBuyerHelpPrompts(product.title);
  }

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

  const hasDescription = Boolean(product.description?.trim());
  const dimensionParts = [
    product.lengthCm != null ? `${product.lengthCm} см` : null,
    product.widthCm != null ? `${product.widthCm} см` : null,
    product.heightCm != null ? `${product.heightCm} см` : null,
  ].filter(Boolean);
  const dimensions =
    dimensionParts.length > 0 ? dimensionParts.join(" × ") : null;

  const sellerShipping = sellerTrust?.shippingDefaults?.trim() || null;

  const prioritySpecs = [
    ...product.characteristics.map((c) => ({
      label: c.name,
      value: c.displayValue,
    })),
    {
      label: "Состояние",
      value: formatCondition(product.condition),
    },
  ];
  if (product.weight != null) {
    prioritySpecs.push({ label: "Вес", value: `${product.weight} кг` });
  }
  if (dimensions) {
    prioritySpecs.push({ label: "Габариты", value: dimensions });
  }

  const restSpecs: Array<{ label: string; value: string }> = [];
  if (product.sku) restSpecs.push({ label: "Артикул", value: product.sku });
  if (product.city) restSpecs.push({ label: "Город", value: product.city });
  if (product.category) {
    restSpecs.push({ label: "Категория", value: product.category.name });
  }
  if (product.productType) {
    restSpecs.push({ label: "Тип товара", value: product.productType.name });
  }
  restSpecs.push({
    label: "Наличие",
    value: product.stock > 0 ? `${product.stock} шт.` : "Нет в наличии",
  });

  const origin = getCanonicalAppUrl();
  const productUrl = `${origin}${ROUTES.PRODUCT}/${product.id}`;
  const ld = productJsonLd({
    name: product.title,
    description:
      product.seoDescription?.trim() ||
      product.description?.trim() ||
      product.title,
    url: productUrl,
    image: product.primaryImage?.url ?? product.images[0]?.url,
    price: product.price,
    currency: product.currency,
    brand: product.brand?.name ?? null,
    sku: product.sku,
    availability: product.stock > 0 ? "InStock" : "OutOfStock",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-10 md:pb-10">
      <JsonLd data={ld} />
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
          {/* 2–4: name → price → buy */}
          <div className="flex flex-col gap-3">
            {product.category ? (
              <Badge
                variant="secondary"
                className="w-fit"
                render={
                  <Link href={categoryPagePath(product.category.slug)} />
                }
              >
                {product.category.name}
              </Badge>
            ) : null}

            {product.brand ? (
              <Badge
                variant="outline"
                className="w-fit"
                render={<Link href={brandPagePath(product.brand.slug)} />}
              >
                {product.brand.name}
              </Badge>
            ) : null}

            {promoted ? <PromotedBadge className="w-fit" /> : null}

            {product.productType ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="pdp-product-type"
              >
                {product.productType.name}
              </p>
            ) : null}

            <h1
              className="font-heading text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:text-4xl"
              data-testid="pdp-title"
            >
              {product.title}
            </h1>

            <div className="flex flex-wrap items-baseline gap-3">
              <p
                className="font-heading text-3xl font-semibold tracking-tight text-primary sm:text-4xl"
                data-testid="pdp-price"
              >
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

          {(() => {
            const isOwnProduct =
              session?.sellerProfileId != null &&
              session.sellerProfileId === product.seller.id;
            const reservation = getReservationAvailability({
              status: product.status,
              stock: product.stock,
              pickupEnabled: product.pickupEnabled,
              reservationEnabled: product.reservationEnabled,
              pickupPointsCount: product.pickupPoints.length,
              prepaymentPercent: product.prepaymentPercent,
              isOwnProduct,
            });
            return (
              <ProductPurchasePanel
                productId={product.id}
                stock={product.stock}
                price={product.price}
                currency={product.currency}
                isOwnProduct={isOwnProduct}
                isAuthenticated={Boolean(session)}
                reservationAvailable={reservation.available}
                prepaymentPercent={reservation.prepaymentPercent}
                reservationReason={reservation.reason}
              />
            );
          })()}

          <PdpWhyBuyBlock
            productId={product.id}
            sellerVerified={Boolean(sellerTrust?.isVerified)}
          />

          {buyerMatch ? (
            <BuyerProductFitBlock match={buyerMatch} productId={product.id} />
          ) : null}

          {buyerHelpPrompts.length > 0 ? (
            <BuyerSmartAssistant
              prompts={buyerHelpPrompts}
              productId={product.id}
            />
          ) : null}

          {buyerEducationTopics.length > 0 ? (
            <BuyerEducationPanel
              topics={buyerEducationTopics}
              productId={product.id}
            />
          ) : null}

          {sellerTrust ? (
            <PdpTrustBlock
              seller={sellerTrust}
              productId={product.id}
              city={product.city}
              weightKg={product.weight}
              lengthCm={product.lengthCm}
              widthCm={product.widthCm}
              heightCm={product.heightCm}
              sellerShipping={sellerShipping}
              pickupEnabled={
                product.pickupEnabled && product.pickupPoints.length > 0
              }
            />
          ) : null}

          <section
            className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
            data-testid="pdp-fulfillment"
          >
            <h2 className="font-heading text-base font-semibold">
              Получение товара
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex gap-2 text-muted-foreground">
                <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Доставка</span>
                  <span className="mt-0.5 block">
                    {sellerShipping
                      ? sellerShipping
                      : "Доставка доступна при оформлении заказа (СДЭК)"}
                  </span>
                </span>
              </li>
              {product.pickupEnabled && product.pickupPoints.length > 0 ? (
                <li className="flex gap-2 text-muted-foreground">
                  <Package className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">
                      Самовывоз доступен
                    </span>
                    <ul className="mt-2 space-y-2">
                      {product.pickupPoints.map((p) => (
                        <li key={p.id} className="rounded-xl bg-surface/60 px-3 py-2">
                          <span className="block font-medium text-foreground">
                            {p.name}
                          </span>
                          <span className="block">
                            {p.city}, {p.address}
                          </span>
                          {p.workingHours ? (
                            <span className="block text-xs">{p.workingHours}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {product.reservationEnabled ? (
                      <span className="mt-2 block text-foreground">
                        Бронь: {product.prepaymentPercent}% предоплата
                      </span>
                    ) : null}
                  </span>
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>

      <Separator className="my-10 sm:my-14" />

      <div className="grid gap-10 lg:grid-cols-2">
        {hasDescription ? (
          <section className="flex flex-col gap-3" data-testid="pdp-description">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Описание
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {product.description}
            </p>
          </section>
        ) : null}

        <PdpCharacteristics
          productId={product.id}
          priority={prioritySpecs}
          rest={restSpecs}
        />

        <section
          className={hasDescription ? "lg:col-span-2" : undefined}
          data-testid="pdp-delivery"
        >
          <PdpSectionViewTracker
            section="delivery"
            productId={product.id}
            event={ANALYTICS_EVENTS.DELIVERY_VIEW}
          />
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Доставка
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card/40 p-4">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">СДЭК</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Пункты выдачи и курьерская доставка. Стоимость считается при
                  оформлении заказа.
                </p>
              </div>
            </div>
            {sellerShipping ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card/40 p-4">
                <Package
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Условия продавца
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">
                    {sellerShipping}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <SimilarProducts products={similar} />
      <FunnelTracker
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        route={`/product/${id}`}
        entityId={product.id}
      />
    </div>
  );
}
