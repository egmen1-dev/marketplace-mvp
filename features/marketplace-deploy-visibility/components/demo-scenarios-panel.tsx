import type { DemoScenario } from "@/lib/marketplace-deploy-visibility/types";

type DemoScenariosPanelProps = {
  scenarios: DemoScenario[];
};

export function DemoScenariosPanel({ scenarios }: DemoScenariosPanelProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-5" data-testid="demo-scenarios">
      <h3 className="font-heading text-lg font-semibold">Demo seed scenarios</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Запуск: <code className="rounded bg-muted px-1">npx tsx prisma/seed-demo-visibility.ts</code>
      </p>
      <ul className="mt-4 space-y-3">
        {scenarios.map((scenario) => (
          <li key={scenario.id} className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="font-medium">{scenario.title}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {scenario.sellerEmail} / {scenario.sellerPassword}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Validates: {scenario.validatesModules.join(", ")}
            </p>
            <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
              {scenario.setup.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
