"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { syncOrderTrackingAction } from "@/lib/marketplace-delivery/delivery/actions";

type BuyerDeliveryProgressProps = {
  orderId: string;
  steps: Array<{ id: string; label: string; done: boolean; active: boolean }>;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export function BuyerDeliveryProgress({
  orderId,
  steps,
  trackingNumber,
  trackingUrl,
}: BuyerDeliveryProgressProps) {
  const [pending, startTransition] = useTransition();

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="buyer-delivery-progress"
    >
      <h2 className="font-medium">Ваш заказ</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {steps.map((step) => (
          <li
            key={step.id}
            className={
              step.done
                ? "text-foreground"
                : step.active
                  ? "text-primary"
                  : "text-muted-foreground"
            }
          >
            {step.done ? "✅" : step.active ? "→" : "○"} {step.label}
          </li>
        ))}
      </ul>
      {trackingNumber ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Трек: {trackingNumber}</span>
          {trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Отследить
            </a>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await syncOrderTrackingAction(orderId);
              })
            }
          >
            Обновить статус
          </Button>
        </div>
      ) : null}
    </section>
  );
}
