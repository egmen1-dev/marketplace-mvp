import { CheckCircle2, Circle } from "lucide-react";

import type { TrustProgressStep } from "@/lib/marketplace-new-seller-trust/types";

type TrustProgressPathProps = {
  steps: TrustProgressStep[];
};

export function TrustProgressPath({ steps }: TrustProgressPathProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5" data-testid="trust-progress-path">
      <p className="font-medium">Путь к высокому доверию</p>
      <ul className="mt-4 space-y-3 text-sm">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-muted-foreground">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0" />
            )}
            <span className={step.done ? "text-foreground" : undefined}>{step.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
