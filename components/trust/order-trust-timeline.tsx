import { Check } from "lucide-react";

import type { TrustTimelineStep } from "@/lib/trust-safety";
import { cn } from "@/lib/utils";

type OrderTrustTimelineProps = {
  steps: TrustTimelineStep[];
  className?: string;
};

export function OrderTrustTimeline({
  steps,
  className,
}: OrderTrustTimelineProps) {
  return (
    <ol
      className={cn("flex flex-col gap-0", className)}
      data-testid="order-trust-timeline"
    >
      {steps.map((step, index) => {
        const done = step.state === "done";
        const current = step.state === "current";
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary bg-primary/15 text-primary",
                  !done &&
                    !current &&
                    "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "my-1 w-px flex-1 min-h-4",
                    done ? "bg-primary/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
            <p
              className={cn(
                "pb-4 text-sm",
                current
                  ? "font-medium text-foreground"
                  : done
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
