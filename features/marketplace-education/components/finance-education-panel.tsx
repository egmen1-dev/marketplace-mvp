import { getFinanceEducationCopy } from "@/lib/marketplace-education/queries";

import { EducationTooltip } from "./education-tooltip";

type FinanceEducationPanelProps = {
  route: string;
};

export function FinanceEducationPanel({ route }: FinanceEducationPanelProps) {
  const copy = getFinanceEducationCopy();

  return (
    <div
      className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
      data-testid="finance-education-panel"
    >
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-lg font-semibold">{copy.title}</h2>
        <EducationTooltip
          tooltipId="tooltip-balance"
          title="Почему деньги ожидаются?"
          body="После оплаты покупателем деньги временно удерживаются до подтверждения получения — это защищает обе стороны."
          route={route}
        />
      </div>
      <ol className="mt-4 space-y-3">
        {copy.steps.map((step, index) => (
          <li
            key={step.label}
            className="rounded-xl border border-border/60 px-3 py-3 text-sm"
            data-testid={`finance-education-step-${index}`}
          >
            <p className="font-medium">{step.label}</p>
            <p className="mt-1 text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
