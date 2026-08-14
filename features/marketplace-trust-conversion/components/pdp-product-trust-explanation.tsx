"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";

import type { ProductTrustExplanationSnapshot } from "@/lib/marketplace-trust-conversion/types";

import { trackTrustDetailsOpenClient } from "./trust-conversion-trackers";

type PdpProductTrustExplanationProps = {
  snapshot: ProductTrustExplanationSnapshot;
  productId: string;
};

export function PdpProductTrustExplanation({
  snapshot,
  productId,
}: PdpProductTrustExplanationProps) {
  const [open, setOpen] = useState(false);

  if (snapshot.lines.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="pdp-product-trust-explanation"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) trackTrustDetailsOpenClient(productId);
        }}
        aria-expanded={open}
      >
        <span className="font-medium">{snapshot.headline}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {snapshot.lines.map((line) => (
            <li key={line.id} className="flex items-start gap-2">
              {line.positive ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <span className="mt-0.5 text-amber-600" aria-hidden>
                  ○
                </span>
              )}
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
