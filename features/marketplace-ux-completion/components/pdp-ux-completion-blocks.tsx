"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { trackTrustBlockView } from "@/lib/marketplace-ux-completion/analytics";
import type { PdpFitUx, PdpTrustUx } from "@/lib/marketplace-ux-completion/types";
import { PURCHASE_EDUCATION_STEPS } from "@/lib/marketplace-ux-completion/trust-ui";

type PdpUxCompletionBlocksProps = {
  trust: PdpTrustUx;
  fit: PdpFitUx;
};

export function PdpUxCompletionBlocks({ trust, fit }: PdpUxCompletionBlocksProps) {
  useEffect(() => {
    if (trust.enabled) trackTrustBlockView("pdp-trust-completion");
  }, [trust.enabled]);

  if (!trust.enabled && !fit.enabled) return null;

  return (
    <div className="flex flex-col gap-4">
      {trust.enabled ? (
        <section
          className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
          data-testid="pdp-trust-completion"
        >
          <h2 className="font-heading text-base font-semibold">Почему можно доверять</h2>
          <p className="mt-1 text-sm text-muted-foreground">Почему можно купить:</p>
          {(trust.sellerScore != null || trust.productScore != null) && (
            <p className="mt-2 text-sm font-medium">
              ⭐ Надёжность — продавец {trust.sellerScore ?? "—"}/100 · товар{" "}
              {trust.productScore ?? "—"}/100
            </p>
          )}
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {trust.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {fit.enabled && fit.reasons.length > 0 ? (
        <section
          className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
          data-testid="pdp-fit-completion"
        >
          <h2 className="font-heading text-base font-semibold">Почему подходит вам</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {fit.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
        data-testid="pdp-purchase-education"
      >
        <h2 className="font-heading text-base font-semibold">Как работает покупка?</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {PURCHASE_EDUCATION_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
