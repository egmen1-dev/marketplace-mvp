import { ShieldCheck } from "lucide-react";

/** Buyer trust copy — not legal escrow. */
export function SafeDealBlock() {
  return (
    <section
      className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5"
      data-testid="safe-deal-block"
    >
      <div className="flex gap-3">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden
        />
        <div>
          <h2 className="font-heading text-base font-medium">
            Безопасная сделка
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ваш платеж защищён. Средства продавец получает после подтверждения
            выполнения заказа.
          </p>
        </div>
      </div>
    </section>
  );
}
