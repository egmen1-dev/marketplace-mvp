import type { TrustExperimentFoundation } from "@/lib/marketplace-trust-conversion/types";

type AdminTrustExperimentsPanelProps = {
  foundation: TrustExperimentFoundation;
};

const STATUS_LABELS = {
  draft: "Черновик",
  running: "В работе",
  completed: "Завершён",
} as const;

export function AdminTrustExperimentsPanel({ foundation }: AdminTrustExperimentsPanelProps) {
  return (
    <section
      className="rounded-2xl border border-dashed border-border bg-card p-5"
      data-testid="admin-trust-experiments"
    >
      <h3 className="font-heading text-lg font-semibold">Trust Experiments Foundation</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Основа для A/B экспериментов trust-слоя · без влияния на ranking
      </p>

      <ul className="mt-4 space-y-3">
        {foundation.experiments.map((experiment) => (
          <li key={experiment.id} className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{experiment.name}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {STATUS_LABELS[experiment.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{experiment.hypothesis}</p>
            <p className="mt-2 text-sm">
              До: <span className="font-medium tabular-nums">{experiment.beforeRate}%</span>
              {" · "}
              После: <span className="font-medium tabular-nums">{experiment.afterRate}%</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
