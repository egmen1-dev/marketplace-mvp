"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/products/mappers";
import type { DeliveryQuote } from "@/lib/delivery/types";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PdpDeliveryEstimateProps = {
  productId: string;
  city: string | null;
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  className?: string;
};

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; quote: DeliveryQuote; etaLabel: string }
  | { status: "error"; message: string }
  | { status: "no_city" };

/** Real delivery quote via /api/delivery/quote — no fabricated prices. */
export function PdpDeliveryEstimate({
  productId,
  city,
  weightKg,
  lengthCm,
  widthCm,
  heightCm,
  className,
}: PdpDeliveryEstimateProps) {
  const [state, setState] = useState<QuoteState>(() =>
    city?.trim() ? { status: "idle" } : { status: "no_city" },
  );

  const fetchQuote = useCallback(async () => {
    const trimmed = city?.trim();
    if (!trimmed) {
      setState({ status: "no_city" });
      return;
    }

    setState({ status: "loading" });
    try {
      const weightGrams =
        weightKg != null && weightKg > 0
          ? Math.round(weightKg * 1000)
          : undefined;

      const res = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "PICKUP",
          city: trimmed,
          weightGrams,
          lengthCm: lengthCm ?? undefined,
          widthCm: widthCm ?? undefined,
          heightCm: heightCm ?? undefined,
        }),
      });

      const data = (await res.json()) as {
        quote?: DeliveryQuote;
        etaLabel?: string;
        error?: string;
      };

      if (!res.ok || !data.quote) {
        setState({
          status: "error",
          message: data.error ?? "Не удалось рассчитать",
        });
        return;
      }

      setState({
        status: "ready",
        quote: data.quote,
        etaLabel: data.etaLabel ?? "",
      });
    } catch {
      setState({ status: "error", message: "Не удалось рассчитать" });
    }
  }, [city, weightKg, lengthCm, widthCm, heightCm]);

  useEffect(() => {
    if (city?.trim()) {
      void fetchQuote();
    }
  }, [city, fetchQuote]);

  return (
    <div
      className={cn("rounded-xl border border-border/80 bg-surface/40 p-3", className)}
      data-testid="pdp-delivery-estimate"
      data-product-id={productId}
    >
      <div className="flex items-start gap-2.5">
        <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Доставка СДЭК</p>

          {state.status === "loading" ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Рассчитываем…
            </p>
          ) : null}

          {state.status === "ready" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                Доставка от {formatPrice(state.quote.cost, state.quote.currency)}
              </span>
              {state.etaLabel ? (
                <span className="block text-xs">Срок: {state.etaLabel}</span>
              ) : null}
              {city ? (
                <span className="block text-xs">Город: {city}</span>
              ) : null}
            </p>
          ) : null}

          {state.status === "no_city" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Точная стоимость — при оформлении заказа. Укажите город получателя
              на checkout.
            </p>
          ) : null}

          {state.status === "error" ? (
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          ) : null}

          {state.status === "idle" || state.status === "error" ? (
            city?.trim() ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto px-0"
                onClick={() => void fetchQuote()}
              >
                Рассчитать доставку
              </Button>
            ) : null
          ) : null}

          {!city?.trim() ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto px-0"
              nativeButton={false}
              render={<Link href={ROUTES.CHECKOUT} />}
            >
              Рассчитать при оформлении
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
