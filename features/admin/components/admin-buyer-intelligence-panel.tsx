import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminBuyerIntelligenceSummary } from "@/lib/buyer-intelligence/types";

type AdminBuyerIntelligencePanelProps = {
  summary: AdminBuyerIntelligenceSummary;
};

export function AdminBuyerIntelligencePanel({
  summary,
}: AdminBuyerIntelligencePanelProps) {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="admin-buyer-intelligence-panel"
    >
      <Card>
        <CardHeader>
          <CardTitle>Buyer Insights</CardTitle>
          <CardDescription>
            Популярные намерения и незакрытые запросы (advisory layer)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {summary.headlines.map((line) => (
              <li
                key={line}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                data-testid="admin-buyer-headline"
              >
                {line}
              </li>
            ))}
          </ul>

          {summary.popularIntents.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Популярные намерения</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.popularIntents.map((row) => (
                  <li key={row.intent} data-testid={`admin-buyer-intent-${row.intent}`}>
                    {row.label}: {row.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.unmetQueries.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Незакрытые запросы</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.unmetQueries.slice(0, 5).map((row) => (
                  <li key={row.query}>
                    «{row.query}» — {row.count}×
                    {row.suggestedCategory
                      ? ` · категория: ${row.suggestedCategory}`
                      : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.growingCategories.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Категории роста</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.growingCategories.slice(0, 5).map((row) => (
                  <li key={row.category}>
                    {row.category}: {row.searchCount} поисков
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
