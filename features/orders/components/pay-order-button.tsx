"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createCheckoutSessionAction } from "@/features/orders/actions";

type PayOrderButtonProps = {
  orderId: string;
};

export function PayOrderButton({ orderId }: PayOrderButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createCheckoutSessionAction(orderId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.href = result.checkoutUrl;
          });
        }}
      >
        {pending ? "Открываем оплату…" : "Оплатить заказ"}
      </Button>
      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
