"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { PdpSectionViewTracker } from "@/features/products/components/pdp-section-view-tracker";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export type SpecItem = { label: string; value: string };

type PdpCharacteristicsProps = {
  productId: string;
  priority: SpecItem[];
  rest: SpecItem[];
  className?: string;
};

function SpecRow({ label, value }: SpecItem) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-3 px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** Important params first; expand reveals the rest + fires analytics. */
export function PdpCharacteristics({
  productId,
  priority,
  rest,
  className,
}: PdpCharacteristicsProps) {
  const [open, setOpen] = useState(false);
  const all = [...priority, ...(open ? rest : [])];

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackEvent({
        event: ANALYTICS_EVENTS.CHARACTERISTICS_EXPAND,
        route: `/product/${productId}`,
        entityId: productId,
      });
    }
  }

  return (
    <section
      className={cn("flex flex-col gap-3", className)}
      data-testid="pdp-specs"
    >
      <PdpSectionViewTracker section="characteristics" productId={productId} />
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        Характеристики
      </h2>
      <p className="text-sm text-muted-foreground">Быстрый просмотр ключевых параметров</p>
      <dl className="divide-y divide-border rounded-2xl border border-border bg-card/50">
        {all.length > 0 ? (
          all.map((row) => (
            <SpecRow key={`${row.label}:${row.value}`} {...row} />
          ))
        ) : (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            Характеристики пока не заполнены продавцом.
          </div>
        )}
      </dl>
      {rest.length > 0 ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={toggle}
          data-testid="pdp-specs-expand"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
          {open ? "Свернуть" : `Ещё ${rest.length}`}
        </button>
      ) : null}
    </section>
  );
}
