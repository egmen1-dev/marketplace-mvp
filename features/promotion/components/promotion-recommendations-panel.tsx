"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/features/products/mappers";
import {
  purchasePromotionAction,
  renewPromotionAction,
  startPromotionAction,
} from "@/features/promotion/actions";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";
import type { PromotionRecommendation } from "@/lib/promotion/intelligence/types";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";

type PromotionRecommendationsPanelProps = {
  recommendations: PromotionRecommendation[];
  billingEnabled: boolean;
  plans: PromotionPlanDto[];
};

export function PromotionRecommendationsPanel({
  recommendations,
  billingEnabled,
  plans,
}: PromotionRecommendationsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.PROMOTION_RECOMMENDATION_VIEW,
      route: ROUTES.ACCOUNT_PROMOTIONS,
    });
  }, []);

  const top = recommendations.filter((r) => !r.isPromoted).slice(0, 8);

  function planIdFor(code: PromotionRecommendation["recommendedPlan"]) {
    if (!code) return null;
    return plans.find((p) => p.name === code)?.id ?? null;
  }

  function acceptRecommendation(row: PromotionRecommendation) {
    startTransition(async () => {
      trackEvent({
        event: ANALYTICS_EVENTS.PROMOTION_RECOMMENDATION_CLICK,
        route: ROUTES.ACCOUNT_PROMOTIONS,
        entityId: row.productId,
      });

      let result;
      if (billingEnabled && row.recommendedPlan) {
        const planId = planIdFor(row.recommendedPlan);
        if (!planId) {
          window.alert("Тариф не найден");
          return;
        }
        result = row.isPromoted
          ? await renewPromotionAction(row.productId, planId)
          : await purchasePromotionAction(row.productId, planId);
      } else if (!billingEnabled) {
        result = await startPromotionAction(row.productId);
      } else {
        window.alert("Выберите тариф в карточке товара");
        return;
      }

      if (!result.ok) {
        if (result.error) window.alert(result.error);
        return;
      }

      trackEvent({
        event: ANALYTICS_EVENTS.PROMOTION_RECOMMENDATION_ACCEPT,
        route: ROUTES.ACCOUNT_PROMOTIONS,
        entityId: row.productId,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      router.refresh();
    });
  }

  if (top.length === 0) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-4"
        data-testid="promotion-recommendations-panel"
      >
        <h2 className="font-heading text-lg font-medium">Что стоит продвигать?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Пока нет рекомендаций — добавьте товары или улучшите карточки.
        </p>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
      data-testid="promotion-recommendations-panel"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="font-heading text-lg font-medium">Что стоит продвигать?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Рекомендации основаны на качестве карточки, спросе и остатках. AI
            не меняет выдачу и не запускает кампании автоматически.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2">Товар</th>
              <th className="px-3 py-2">Шанс продажи</th>
              <th className="px-3 py-2">Рекомендуемый бюджет</th>
              <th className="px-3 py-2">Причины</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {top.map((row) => (
              <tr
                key={row.productId}
                className="border-b border-border/60 align-top"
                data-testid={`promotion-recommendation-${row.productId}`}
              >
                <td className="px-3 py-3">
                  <Link
                    href={sellerProductEditPath(row.productId)}
                    className="font-medium hover:text-primary"
                    onClick={() =>
                      trackEvent({
                        event: ANALYTICS_EVENTS.PROMOTION_RECOMMENDATION_CLICK,
                        route: ROUTES.ACCOUNT_PROMOTIONS,
                        entityId: row.productId,
                      })
                    }
                  >
                    {row.productTitle}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.recommendation}
                  </p>
                </td>
                <td className="px-3 py-3 tabular-nums">
                  <Badge variant={row.score >= 50 ? "default" : "secondary"}>
                    {row.score}/100
                  </Badge>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {row.recommendedPlanLabel ?? "—"}
                  {row.recommendedBudget != null ? (
                    <p className="mt-1 text-xs">
                      {formatPrice(row.recommendedBudget, "RUB")}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  {row.improvements.length > 0 ? (
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">Почему этот товар?</p>
                      <p className="text-destructive/90">
                        Не рекомендуем запускать рекламу:
                      </p>
                      <ul className="list-inside list-disc text-muted-foreground">
                        {row.improvements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li className="font-medium text-foreground">
                        Почему этот товар?
                      </li>
                      {row.reasons.slice(0, 4).map((reason) => (
                        <li key={reason} className="flex items-start gap-1.5">
                          <Check
                            className="mt-0.5 size-3 shrink-0 text-primary"
                            aria-hidden
                          />
                          {reason}
                        </li>
                      ))}
                      {row.timingReasons.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-3">
                  {row.ready && row.score >= 50 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => acceptRecommendation(row)}
                      data-testid={`promotion-recommendation-accept-${row.productId}`}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : billingEnabled ? (
                        "Оплатить"
                      ) : (
                        "Продвигать"
                      )}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
