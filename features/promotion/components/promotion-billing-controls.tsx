"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  purchasePromotionAction,
  renewPromotionAction,
} from "@/features/promotion/actions";
import { formatPrice } from "@/features/products/mappers";
import type { PromotionOrderDto } from "@/lib/promotion/billing/types";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";
import { formatPromotionPeriodLabel } from "@/lib/promotion/billing/plans";

type PromotionBillingControlsProps = {
  productId: string;
  currency: string;
  isPromoted: boolean;
  readinessReady: boolean;
  activeOrder: PromotionOrderDto | null;
  plans: PromotionPlanDto[];
  pending: boolean;
  onPendingAction: (
    action: () => Promise<{ ok: boolean; error?: string; checkoutUrl?: string }>,
  ) => void;
};

function formatEndDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function PromotionBillingControls({
  productId,
  currency,
  isPromoted,
  readinessReady,
  activeOrder,
  plans,
  pending,
  onPendingAction,
}: PromotionBillingControlsProps) {
  const defaultPlanId = plans[0]?.id ?? "";
  const [planId, setPlanId] = useState(defaultPlanId);
  const selectedPlan = plans.find((p) => p.id === planId) ?? plans[0];

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Тарифы продвижения пока недоступны.
      </p>
    );
  }

  function checkout(action: typeof purchasePromotionAction) {
    if (!planId) return;
    onPendingAction(() => action(productId, planId));
  }

  return (
    <div
      className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm"
      data-testid={`promotion-billing-${productId}`}
    >
      <p className="font-medium">
        {isPromoted ? "Продление продвижения" : "Оплата продвижения"}
      </p>

      {activeOrder ? (
        <dl className="mt-2 grid gap-1 text-muted-foreground">
          <div className="flex justify-between gap-4">
            <dt>Стоимость</dt>
            <dd className="font-medium text-foreground">
              {formatPrice(activeOrder.amount, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Период</dt>
            <dd className="font-medium text-foreground">
              {activeOrder.plan
                ? formatPromotionPeriodLabel(activeOrder.plan.durationDays)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Дата окончания</dt>
            <dd
              className="font-medium text-foreground"
              data-testid={`promotion-end-date-${productId}`}
            >
              {formatEndDate(activeOrder.endedAt)}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        <label className="text-xs text-muted-foreground" htmlFor={`plan-${productId}`}>
          Выберите срок
        </label>
        <select
          id={`plan-${productId}`}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          data-testid={`promotion-plan-select-${productId}`}
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {formatPromotionPeriodLabel(plan.durationDays)} ·{" "}
              {formatPrice(plan.price, currency)}
            </option>
          ))}
        </select>

        {selectedPlan ? (
          <p className="text-xs text-muted-foreground">
            {formatPromotionPeriodLabel(selectedPlan.durationDays)} ·{" "}
            {formatPrice(selectedPlan.price, currency)}
          </p>
        ) : null}

        <Button
          type="button"
          size="sm"
          disabled={pending || !readinessReady || !planId}
          onClick={() =>
            checkout(isPromoted ? renewPromotionAction : purchasePromotionAction)
          }
          data-testid={
            isPromoted
              ? `promotion-renew-${productId}`
              : `promotion-purchase-${productId}`
          }
        >
          {isPromoted ? "Продлить продвижение" : "Купить продвижение"}
        </Button>
      </div>
    </div>
  );
}
