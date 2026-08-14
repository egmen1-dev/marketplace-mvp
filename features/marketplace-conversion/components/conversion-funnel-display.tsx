"use client";

import { useEffect } from "react";

import { trackConversionFunnelView } from "@/lib/marketplace-conversion/analytics";
import type { FunnelStepDisplay } from "@/lib/marketplace-conversion/funnel";

type ConversionFunnelDisplayProps = {
  steps: FunnelStepDisplay[];
  summary: string[];
};

export function ConversionFunnelDisplay({ steps, summary }: ConversionFunnelDisplayProps) {
  useEffect(() => {
    trackConversionFunnelView("admin");
  }, []);

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="conversion-funnel-display"
    >
      <h2 className="font-heading text-lg font-semibold">Marketplace Funnel</h2>
      <p className="mt-1 text-sm text-muted-foreground">Конверсия:</p>
      <ul className="mt-4 space-y-2 font-mono text-sm">
        {summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className="rounded-xl border border-border/80 bg-surface/40 px-3 py-2 text-sm"
          >
            <p className="font-medium">{step.label}</p>
            <p className="tabular-nums text-muted-foreground">
              {step.uniqueVisitors || step.count} уник.
              {step.conversionFromPrevious != null
                ? ` · ${step.conversionFromPrevious}%`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
