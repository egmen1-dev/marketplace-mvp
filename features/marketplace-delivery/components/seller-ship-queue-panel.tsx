"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createShipmentAction } from "@/lib/marketplace-delivery/delivery/actions";
import type { SellerShipQueueItem } from "@/lib/marketplace-delivery/delivery/types";
import { formatPrice } from "@/features/products/mappers";
import { formatOrderDate } from "@/features/orders/lib/status";

type SellerShipQueuePanelProps = {
  items: SellerShipQueueItem[];
};

export function SellerShipQueuePanel({ items }: SellerShipQueuePanelProps) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Нет заказов, ожидающих отправки.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="seller-ship-queue">
      {items.map((item) => (
        <div
          key={item.orderId}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">Заказ {item.orderNumber}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.buyerName} · {formatPrice(item.total, item.currency)}
              </p>
              {item.shipmentDeadline ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Отправить до {formatOrderDate(item.shipmentDeadline)}
                </p>
              ) : null}
              {item.pickupAddress ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  ПВЗ: {item.pickupAddress}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {item.trackingNumber ? (
                <p className="text-sm text-muted-foreground">
                  Трек: {item.trackingNumber}
                </p>
              ) : (
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await createShipmentAction(item.orderId);
                    })
                  }
                >
                  Создать отправление
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
