"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Label } from "@/components/ui/label";
import {
  formatDeliveryEta,
  type DeliveryMethodType,
  type DeliveryQuote,
  type PickupPoint,
} from "@/lib/delivery/types";
import { formatPrice } from "@/features/products/mappers";
import { cn } from "@/lib/utils";

type DeliverySectionProps = {
  disabled?: boolean;
  currency: string;
  fieldErrors?: Record<string, string[]>;
  onQuoteChange: (quote: DeliveryQuote | null) => void;
  onMethodChange?: (method: DeliveryMethodType) => void;
};

type QuoteResponse = {
  quote: DeliveryQuote;
  etaLabel: string;
};

export function DeliverySection({
  disabled = false,
  currency,
  fieldErrors,
  onQuoteChange,
  onMethodChange,
}: DeliverySectionProps) {
  const [method, setMethod] = useState<DeliveryMethodType>("PICKUP");
  const [city, setCity] = useState("");
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [etaLabel, setEtaLabel] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingPoints, startPoints] = useTransition();
  const [loadingQuote, startQuote] = useTransition();
  const cityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onQuoteChangeRef = useRef(onQuoteChange);
  onQuoteChangeRef.current = onQuoteChange;

  function selectMethod(next: DeliveryMethodType) {
    setMethod(next);
    onMethodChange?.(next);
  }

  const selectedPoint = points.find((p) => p.code === selectedCode) ?? null;

  // Fetch PVZ when city changes (PICKUP).
  useEffect(() => {
    if (cityDebounce.current) clearTimeout(cityDebounce.current);

    if (city.trim().length < 2) {
      setPoints([]);
      setSelectedCode("");
      setPointsError(null);
      return;
    }

    cityDebounce.current = setTimeout(() => {
      startPoints(async () => {
        setPointsError(null);
        try {
          const res = await fetch(
            `/api/delivery/points?city=${encodeURIComponent(city.trim())}`,
          );
          const data = (await res.json()) as {
            points?: PickupPoint[];
            error?: string;
          };
          if (!res.ok) {
            setPoints([]);
            setSelectedCode("");
            setPointsError(data.error ?? "Не удалось загрузить ПВЗ");
            return;
          }
          const next = data.points ?? [];
          setPoints(next);
          setSelectedCode((prev) =>
            next.some((p) => p.code === prev) ? prev : (next[0]?.code ?? ""),
          );
        } catch {
          setPoints([]);
          setSelectedCode("");
          setPointsError("Не удалось загрузить ПВЗ");
        }
      });
    }, 350);

    return () => {
      if (cityDebounce.current) clearTimeout(cityDebounce.current);
    };
  }, [city]);

  // Fetch quote when method / city / selected PVZ change.
  useEffect(() => {
    if (city.trim().length < 2) {
      setQuote(null);
      setEtaLabel(null);
      onQuoteChangeRef.current(null);
      return;
    }
    if (method === "PICKUP" && !selectedCode) {
      setQuote(null);
      setEtaLabel(null);
      onQuoteChangeRef.current(null);
      return;
    }

    const controller = new AbortController();
    startQuote(async () => {
      setQuoteError(null);
      try {
        const res = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            method,
            city: city.trim(),
            ...(method === "PICKUP" ? { pickupPointCode: selectedCode } : {}),
          }),
        });
        const data = (await res.json()) as QuoteResponse & { error?: string };
        if (!res.ok) {
          setQuote(null);
          setEtaLabel(null);
          onQuoteChangeRef.current(null);
          setQuoteError(data.error ?? "Не удалось рассчитать доставку");
          return;
        }
        setQuote(data.quote);
        setEtaLabel(data.etaLabel);
        onQuoteChangeRef.current(data.quote);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setQuote(null);
        setEtaLabel(null);
        onQuoteChangeRef.current(null);
        setQuoteError("Не удалось рассчитать доставку");
      }
    });

    return () => controller.abort();
  }, [method, city, selectedCode]);

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <h2 className="font-heading text-lg font-medium">Доставка СДЭК</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Выберите пункт выдачи или курьера — стоимость войдёт в сумму заказа.
      </p>

      <input type="hidden" name="deliveryMethod" value={method} />
      <input type="hidden" name="city" value={city} />
      <input
        type="hidden"
        name="pickupPointId"
        value={method === "PICKUP" ? selectedCode : ""}
      />
      <input
        type="hidden"
        name="pickupAddress"
        value={
          method === "PICKUP" && selectedPoint
            ? `${selectedPoint.city}, ${selectedPoint.address}`
            : ""
        }
      />

      <div className="mt-5 flex flex-col gap-4">
        <div
          className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface/60 p-1"
          role="group"
          aria-label="Способ доставки"
        >
          {(
            [
              { value: "PICKUP" as const, label: "Пункт выдачи" },
              { value: "COURIER" as const, label: "Курьер" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => selectMethod(opt.value)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                method === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="deliveryCity">Город</Label>
          <input
            id="deliveryCity"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            disabled={disabled}
            placeholder="Москва"
            aria-invalid={Boolean(fieldErrors?.city)}
            className={cn(
              "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none",
              "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-50",
            )}
          />
          {fieldErrors?.city?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.city[0]}</p>
          ) : null}
        </div>

        {method === "PICKUP" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="pickupPoint">Пункт выдачи (ПВЗ)</Label>
            {loadingPoints ? (
              <p className="text-xs text-muted-foreground">Ищем пункты…</p>
            ) : null}
            {pointsError ? (
              <p className="text-xs text-destructive">{pointsError}</p>
            ) : null}
            <select
              id="pickupPoint"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              disabled={disabled || points.length === 0}
              className={cn(
                "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              )}
              aria-invalid={Boolean(fieldErrors?.pickupPointId)}
            >
              {points.length === 0 ? (
                <option value="">
                  {city.trim().length < 2
                    ? "Сначала укажите город"
                    : "Нет доступных пунктов"}
                </option>
              ) : (
                points.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} — {p.address}
                  </option>
                ))
              )}
            </select>
            {selectedPoint?.workTime ? (
              <p className="text-xs text-muted-foreground">
                {selectedPoint.workTime}
              </p>
            ) : null}
            {fieldErrors?.pickupPointId?.[0] ? (
              <p className="text-xs text-destructive">
                {fieldErrors.pickupPointId[0]}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-xl border border-border/80 bg-surface/50 px-4 py-3 text-sm",
            !quote && "text-muted-foreground",
          )}
        >
          {loadingQuote && !quote ? (
            <p>Считаем стоимость…</p>
          ) : quoteError ? (
            <p className="text-destructive">{quoteError}</p>
          ) : quote ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                Стоимость:{" "}
                <span className="font-medium text-foreground">
                  {formatPrice(quote.cost, currency)}
                </span>
              </span>
              <span className="text-muted-foreground">
                Срок:{" "}
                {etaLabel ??
                  formatDeliveryEta(
                    quote.estimatedMinDays,
                    quote.estimatedMaxDays,
                  )}
              </span>
            </div>
          ) : (
            <p>Укажите город, чтобы рассчитать доставку</p>
          )}
        </div>
      </div>
    </section>
  );
}
