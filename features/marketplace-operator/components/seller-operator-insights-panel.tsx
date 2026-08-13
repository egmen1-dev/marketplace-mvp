import Link from "next/link";
import { ClipboardList } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SellerOperatorConnection } from "@/lib/marketplace-operator/types";

type SellerOperatorInsightsPanelProps = {
  connection: SellerOperatorConnection;
};

export function SellerOperatorInsightsPanel({
  connection,
}: SellerOperatorInsightsPanelProps) {
  if (connection.insights.length === 0) return null;

  return (
    <Card
      className="border-amber-500/20 bg-amber-500/5"
      data-testid="seller-operator-insights"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Marketplace Operator</CardTitle>
        </div>
        <CardDescription>
          Стратегические рекомендации — выполняются вручную, без автодействий.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection.insights.map((insight) => (
          <div key={insight.headline} className="space-y-1 text-sm">
            <p className="font-medium">{insight.headline}</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {insight.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {insight.href ? (
              <Link
                href={insight.href}
                className="inline-block text-primary underline-offset-4 hover:underline"
              >
                {insight.recommendedAction} →
              </Link>
            ) : (
              <p className="text-muted-foreground">{insight.recommendedAction}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
