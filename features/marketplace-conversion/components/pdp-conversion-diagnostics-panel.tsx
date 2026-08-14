"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  trackConversionActionClick,
  trackConversionProblemView,
} from "@/lib/marketplace-conversion/analytics";
import type { PdpConversionDiagnostics } from "@/lib/marketplace-conversion/queries";

type PdpConversionDiagnosticsPanelProps = {
  diagnostics: PdpConversionDiagnostics;
};

export function PdpConversionDiagnosticsPanel({
  diagnostics,
}: PdpConversionDiagnosticsPanelProps) {
  useEffect(() => {
    if (diagnostics.enabled) {
      trackConversionProblemView(`pdp-${diagnostics.productId}`);
    }
  }, [diagnostics.enabled, diagnostics.productId]);

  if (!diagnostics.enabled) return null;

  return (
    <section
      className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"
      data-testid="pdp-conversion-diagnostics"
    >
      <h2 className="font-heading text-base font-semibold">Почему покупатели уходят?</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {diagnostics.views} просмотров · {diagnostics.cartAdds} в корзину
        {diagnostics.viewToCartRate != null
          ? ` · ${diagnostics.viewToCartRate}%`
          : ""}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {diagnostics.signals.map((s) => (
          <li
            key={s.text}
            className={
              s.type === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
            }
          >
            {s.text}
          </li>
        ))}
      </ul>
      {diagnostics.recommendation ? (
        <div className="mt-4 rounded-xl border border-border bg-card/80 p-3 text-sm">
          <p className="font-medium">{diagnostics.recommendation.problem}</p>
          <p className="mt-1 text-muted-foreground">{diagnostics.recommendation.action}</p>
          {diagnostics.recommendation.ctaHref ? (
            <Button
              className="mt-3"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={diagnostics.recommendation.ctaHref}
                  onClick={() =>
                    trackConversionActionClick(diagnostics.recommendation!.id)
                  }
                />
              }
            >
              {diagnostics.recommendation.ctaLabel ?? "Исправить"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
