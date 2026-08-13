"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Loader2, Megaphone, Pause } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/features/products/components/product-image";
import {
  endPromotionAction,
  pausePromotionAction,
  startPromotionAction,
} from "@/features/promotion/actions";
import { PromotionBillingControls } from "@/features/promotion/components/promotion-billing-controls";
import { PromotionCampaignAnalyticsCard } from "@/features/promotion/components/promotion-campaign-analytics-card";
import { formatPrice } from "@/features/products/mappers";
import type { SellerPromotionRow } from "@/lib/promotion/types";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";
import {
  PROMOTION_SURFACE_LABELS,
  SELLER_SURFACE_LABELS,
} from "@/lib/promotion/surfaces";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";

function statusLabel(row: SellerPromotionRow) {
  if (row.isPromoted) return "Активно";
  if (row.campaign?.status === "PAUSED") return "На паузе";
  if (row.campaign?.status === "ENDED") return "Завершено";
  return "Не продвигается";
}

type SellerPromotionsPanelProps = {
  rows: SellerPromotionRow[];
  surfacesEnabled: boolean;
  analyticsEnabled: boolean;
  billingEnabled: boolean;
  plans: PromotionPlanDto[];
};

export function SellerPromotionsPanel({
  rows,
  surfacesEnabled,
  analyticsEnabled,
  billingEnabled,
  plans,
}: SellerPromotionsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: (id: string) => Promise<{ ok: boolean; error?: string; checkoutUrl?: string }>,
    productId: string,
  ) {
    startTransition(async () => {
      const result = await action(productId);
      if (!result.ok && result.error) {
        window.alert(result.error);
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      router.refresh();
    });
  }

  function runBilling(
    action: () => Promise<{ ok: boolean; error?: string; checkoutUrl?: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error) {
        window.alert(result.error);
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        У вас пока нет товаров.{" "}
        <Link href={ROUTES.ACCOUNT_PRODUCTS_NEW} className="text-primary underline-offset-4 hover:underline">
          Создать товар
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="seller-promotions-panel">
      {!surfacesEnabled ? (
        <p
          className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          data-testid="promotion-surfaces-disabled-notice"
        >
          Продвижение подготовлено. Размещение будет доступно после включения
          рекламных мест на площадке.
        </p>
      ) : null}

      {rows.map((row) => (
        <article
          key={row.productId}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start"
          data-testid={`promotion-row-${row.productId}`}
        >
          <div className="relative w-full max-w-[88px] shrink-0 overflow-hidden rounded-xl">
            <ProductImage
              src={row.imageUrl}
              alt={row.title}
              sizes="88px"
              containerClassName="aspect-square"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={sellerProductEditPath(row.productId)}
                  className="font-medium hover:text-primary"
                >
                  {row.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(row.price, row.currency)} · Quality{" "}
                  {row.readiness.qualityScore}/100
                </p>
              </div>
              <Badge variant={row.isPromoted ? "default" : "secondary"}>
                {statusLabel(row)}
              </Badge>
            </div>

            {!row.readiness.ready && row.readiness.blockers.length > 0 ? (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {row.readiness.blockers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {(row.campaign || row.isPromoted) ? (
              <div
                className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                data-testid={`promotion-placements-${row.productId}`}
              >
                <p className="font-medium">Где показывается товар</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                    Карточка товара (badge)
                  </li>
                  {row.placements.length === 0 ? (
                    <li>Размещения появятся после запуска кампании</li>
                  ) : (
                    row.placements.map((placement) => (
                      <li
                        key={placement.id}
                        className="flex items-center gap-2"
                      >
                        {placement.active ? (
                          <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <span className="size-3.5 shrink-0 text-center text-xs">—</span>
                        )}
                        {SELLER_SURFACE_LABELS[placement.surface] ??
                          PROMOTION_SURFACE_LABELS[placement.surface]}
                        {!placement.active ? " (неактивно)" : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}

            {analyticsEnabled &&
            row.isPromoted &&
            row.performance &&
            row.campaign ? (
              <PromotionCampaignAnalyticsCard
                productId={row.productId}
                currency={row.currency}
                performance={row.performance}
              />
            ) : null}

            {billingEnabled ? (
              <PromotionBillingControls
                productId={row.productId}
                currency={row.currency}
                isPromoted={row.isPromoted}
                readinessReady={row.readiness.ready}
                activeOrder={row.activeOrder}
                plans={plans}
                pending={pending}
                onPendingAction={runBilling}
              />
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              {row.isPromoted ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(pausePromotionAction, row.productId)}
                    data-testid={`promotion-pause-${row.productId}`}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Pause data-icon="inline-start" aria-hidden />
                    )}
                    Пауза
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(endPromotionAction, row.productId)}
                  >
                    Завершить
                  </Button>
                </>
              ) : billingEnabled ? null : (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !row.readiness.ready}
                  onClick={() => run(startPromotionAction, row.productId)}
                  data-testid={`promotion-start-${row.productId}`}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Megaphone data-icon="inline-start" aria-hidden />
                  )}
                  Продвигать товар
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
