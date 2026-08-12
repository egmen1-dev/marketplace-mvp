import Link from "next/link";
import {
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Star,
} from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { ProductSellerCard } from "@/features/seller/components/product-seller-card";
import {
  getVisibleSellerMetrics,
  resolveSellerBadges,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
import { PdpDeliveryEstimate } from "@/features/products/components/pdp-delivery-estimate";
import { PdpSectionViewTracker } from "@/features/products/components/pdp-section-view-tracker";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PdpTrustBlockProps = {
  seller: SellerTrustProfile;
  productId: string;
  city: string | null;
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  sellerShipping?: string | null;
  pickupEnabled?: boolean;
  className?: string;
};

export function PdpTrustBlock({
  seller,
  productId,
  city,
  weightKg,
  lengthCm,
  widthCm,
  heightCm,
  sellerShipping,
  pickupEnabled = false,
  className,
}: PdpTrustBlockProps) {
  const badges = resolveSellerBadges({
    isVerified: seller.isVerified,
    kind: seller.kind,
    joinedAt: seller.joinedAt,
    completedOrdersCount: seller.metrics.completedOrdersCount,
  });
  const isNewSeller = badges.includes("NEW_SELLER");
  const metrics = getVisibleSellerMetrics(seller.metrics);
  const hasSales = metrics.some((m) => m.key === "sales" || m.key === "orders");

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4 sm:p-5",
        className,
      )}
      data-testid="pdp-trust-block"
    >
      <TrustBlockViewTracker blockId="pdp" route={`${ROUTES.PRODUCT}/${productId}`} />
      <PdpSectionViewTracker
        section="seller"
        productId={productId}
        event={ANALYTICS_EVENTS.SELLER_BLOCK_VIEW}
      />

      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Надёжная покупка
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Информация о продавце, доставке и защите на {APP_NAME}.
        </p>
      </div>

      <ProductSellerCard seller={seller} className="border-0 bg-transparent p-0" />

      {isNewSeller || !hasSales ? (
        <div
          className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-sm"
          data-testid="pdp-seller-trust-empty"
        >
          {isNewSeller ? (
            <p className="font-medium text-foreground">Новый продавец</p>
          ) : null}
          <p className="text-muted-foreground">
            {isNewSeller
              ? "Продавец недавно на площадке. Мы показываем только подтверждённые заказы — без накруток. После первых продаж появятся метрики доверия."
              : "Площадка проверяет продавцов. Статистика появится после первых заказов."}
          </p>
        </div>
      ) : null}

      <PdpDeliveryEstimate
        productId={productId}
        city={city}
        weightKg={weightKg}
        lengthCm={lengthCm}
        widthCm={widthCm}
        heightCm={heightCm}
      />

      {sellerShipping ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Условия продавца: </span>
          {sellerShipping}
        </p>
      ) : null}

      {pickupEnabled ? (
        <p className="text-sm text-muted-foreground">
          Доступен самовывоз у продавца — см. блок «Получение товара» ниже.
        </p>
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-2">
        <li className="flex items-start gap-2 rounded-xl bg-surface/60 px-3 py-2.5 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Безопасная оплата</span>
            <span className="mt-0.5 block text-muted-foreground">
              Оплата картой — данные не передаются продавцу
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-surface/60 px-3 py-2.5 text-sm">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Возврат</span>
            <span className="mt-0.5 block text-muted-foreground">
              <Link
                href={ROUTES.TERMS}
                className="text-primary underline-offset-4 hover:underline"
              >
                Условия возврата
              </Link>{" "}
              в пользовательском соглашении
            </span>
          </span>
        </li>
      </ul>

      <div
        className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3"
        data-testid="pdp-reviews-placeholder"
      >
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Star className="size-4 text-muted-foreground" aria-hidden />
          Отзывы
        </p>
        <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Будьте первым покупателем — отзывы появятся после реальных покупок.
        </p>
        <p
          className="mt-2 text-sm text-muted-foreground"
          data-testid="pdp-rating-empty"
        >
          Рейтинг появится после первых покупок.
        </p>
      </div>
    </section>
  );
}
