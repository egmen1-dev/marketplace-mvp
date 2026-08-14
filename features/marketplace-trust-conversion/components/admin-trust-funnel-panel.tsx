import type { TrustConversionFunnelSnapshot } from "@/lib/marketplace-trust-conversion/types";

type AdminTrustFunnelPanelProps = {
  funnel: TrustConversionFunnelSnapshot;
};

export function AdminTrustFunnelPanel({ funnel }: AdminTrustFunnelPanelProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="admin-trust-funnel"
    >
      <h3 className="font-heading text-lg font-semibold">Trust Analytics Funnel</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Путь покупателя через слой доверия за {funnel.windowDays} дн.
      </p>

      <ol className="mt-4 space-y-3">
        {funnel.steps.map((step, index) => (
          <li key={step.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{step.label}</p>
              <p className="text-muted-foreground">
                {step.uniqueVisitors.toLocaleString("ru-RU")} уникальных ·{" "}
                {step.count.toLocaleString("ru-RU")} событий
                {step.conversionFromPrev != null
                  ? ` · ${step.conversionFromPrev}% от предыдущего шага`
                  : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
