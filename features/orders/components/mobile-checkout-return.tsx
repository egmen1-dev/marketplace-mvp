"use client";

import { useEffect } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildMobileOrderReturnDeepLink } from "@/lib/mobile/checkout-return-cookie";

type MobileCheckoutReturnProps = {
  orderId: string;
  orderNumber: string;
  /** When true, attempt automatic deep-link open once (mobile browser handoff). */
  autoOpen?: boolean;
};

export function MobileCheckoutReturn({
  orderId,
  orderNumber,
  autoOpen = false,
}: MobileCheckoutReturnProps) {
  const deepLink = buildMobileOrderReturnDeepLink(orderId);

  useEffect(() => {
    if (!autoOpen) return;
    const timer = window.setTimeout(() => {
      window.location.href = deepLink;
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoOpen, deepLink]);

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="mobile-checkout-return"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-medium text-foreground">Заказ оформлен</p>
          <p className="mt-1 text-sm text-muted-foreground">
            №{orderNumber} — вернитесь в приложение ЛОТ, чтобы отслеживать статус.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="shrink-0"
        onClick={() => {
          window.location.href = deepLink;
        }}
      >
        Открыть в приложении
      </Button>
    </div>
  );
}
