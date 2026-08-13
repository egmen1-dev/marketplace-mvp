import { SELLER_PAYOUT_EDUCATION_STEPS } from "@/lib/trust-safety";
import { cn } from "@/lib/utils";

type SellerPayoutEducationProps = {
  className?: string;
};

export function SellerPayoutEducation({ className }: SellerPayoutEducationProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface/50 p-4 sm:p-5",
        className,
      )}
      data-testid="seller-payout-education"
    >
      <h2 className="font-heading text-base font-semibold tracking-tight">
        Как работает выплата
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {SELLER_PAYOUT_EDUCATION_STEPS.map((step, i) => (
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
