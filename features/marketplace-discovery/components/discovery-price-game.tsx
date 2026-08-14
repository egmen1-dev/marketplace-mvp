"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/products/components/product-card";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import type { PriceGameRound } from "@/lib/marketplace-discovery/types";
import {
  trackPriceGameCompleted,
  trackPriceGameStarted,
} from "@/lib/marketplace-discovery/analytics";

type DiscoveryPriceGameProps = {
  round: PriceGameRound;
};

export function DiscoveryPriceGame({ round }: DiscoveryPriceGameProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const revealed = selected != null;
  const correct = selected === round.correctIndex;

  function pick(index: number) {
    setSelected(index);
    startTransition(() => {
      trackPriceGameStarted(round.product.id);
      if (index === round.correctIndex) {
        trackPriceGameCompleted(round.product.id);
      }
    });
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      data-testid="discovery-price-game"
    >
      <h3 className="font-heading text-xl font-semibold">Угадайте цену</h3>
      <p className="mt-1 text-sm text-muted-foreground">Как думаете, сколько стоит?</p>
      <div className="mt-4 max-w-xs">
        <ProductCard product={round.product} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {round.options.map((opt, i) => (
          <Button
            key={opt.label}
            variant={selected === i ? "default" : "outline"}
            disabled={revealed}
            onClick={() => pick(i)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {revealed ? (
        <div className="mt-4 rounded-xl bg-surface/60 p-4 text-sm">
          <p className="font-medium">
            Правильный ответ: {formatPrice(round.product.price, round.product.currency)}{" "}
            {correct ? "🎉" : ""}
          </p>
          <p className="mt-1 text-muted-foreground">
            {correct
              ? "Вы нашли выгодную покупку"
              : "Попробуйте ещё раз с другим товаром"}
          </p>
          <Button
            className="mt-3"
            nativeButton={false}
            render={<Link href={`${ROUTES.PRODUCT}/${round.product.id}`} />}
          >
            Забрать товар
          </Button>
        </div>
      ) : null}
    </div>
  );
}
