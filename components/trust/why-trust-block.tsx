import { Check } from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { PDP_WHY_TRUST_ITEMS } from "@/lib/trust-safety";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type WhyTrustBlockProps = {
  productId: string;
  className?: string;
};

export function WhyTrustBlock({ productId, className }: WhyTrustBlockProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/40 p-4 sm:p-5",
        className,
      )}
      data-testid="pdp-why-trust"
    >
      <TrustBlockViewTracker
        blockId="why-trust"
        route={`${ROUTES.PRODUCT}/${productId}`}
      />
      <h2 className="font-heading text-base font-semibold tracking-tight">
        Почему можно доверять
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {PDP_WHY_TRUST_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-sm text-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
