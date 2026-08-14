import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Оплата покупателем", body: "Деньги заморожены в безопасной сделке" },
  { title: "Проверка получения", body: "Покупатель проверяет товар и подтверждает получение" },
  { title: "Доступный баланс", body: "Средства (за вычетом комиссии) переходят на баланс" },
] as const;

type BalanceReceptionFlowProps = {
  className?: string;
};

/** Spec §2 — payment → reception check → available balance. */
export function BalanceReceptionFlow({ className }: BalanceReceptionFlowProps) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
      data-testid="balance-reception-flow"
    >
      <h2 className="font-heading text-lg font-semibold">Как работают деньги</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Проверка получения — понятно и просто
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-xl border border-border/80 bg-surface/40 p-4"
          >
            <p className="text-xs font-medium text-primary">Шаг {i + 1}</p>
            <p className="mt-1 font-medium">{step.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Дождитесь проверки покупателя. Вы получите уведомление, когда заказ будет завершён.
      </p>
    </section>
  );
}
