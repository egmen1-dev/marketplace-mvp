import { ShieldCheck } from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { CHECKOUT_SAFE_DEAL_STEPS } from "@/lib/trust-safety";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SafeDealBlockProps = {
  className?: string;
};

/** «Безопасная сделка» — checkout trust education (no legal «эскроу»). */
export function SafeDealBlock({ className }: SafeDealBlockProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface/50 p-4 sm:p-5",
        className,
      )}
      data-testid="checkout-safe-deal"
    >
      <TrustBlockViewTracker blockId="safe-deal" route={ROUTES.CHECKOUT} />
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
        <ShieldCheck className="size-5 text-primary" aria-hidden />
        Безопасная сделка
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {CHECKOUT_SAFE_DEAL_STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span>
              <span className="font-medium text-foreground">{step.title}</span>
              <span className="mt-0.5 block text-muted-foreground">
                {step.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
