import { cn } from "@/lib/utils";

const STEPS = [
  "Принять заказ",
  "Отправить товар (до 2 дней)",
  "Товар в пути",
  "Доставлено",
] as const;

type OrderFulfillmentStepsProps = {
  className?: string;
};

/** Spec §7 — 4-step seller order process map. */
export function OrderFulfillmentSteps({ className }: OrderFulfillmentStepsProps) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-card/50 p-4", className)}
      data-testid="order-fulfillment-steps"
    >
      <p className="text-sm font-medium">Как обрабатывается заказ</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="rounded-lg border border-border/70 bg-background px-3 py-2 text-center text-xs sm:text-sm"
          >
            <span className="font-medium text-primary">{i + 1}. </span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
        Просрочка отправки снижает рейтинг магазина и может привести к блокировке.
      </p>
    </section>
  );
}
