import Link from "next/link";
import { Brain } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SellerMarketplaceConnection } from "@/lib/marketplace-intelligence/types";

type SellerMarketplaceInsightsPanelProps = {
  connection: SellerMarketplaceConnection;
};

export function SellerMarketplaceInsightsPanel({
  connection,
}: SellerMarketplaceInsightsPanelProps) {
  if (connection.insights.length === 0) return null;

  return (
    <Card
      className="border-primary/20 bg-primary/5"
      data-testid="seller-marketplace-insights"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Marketplace Brain</CardTitle>
        </div>
        <CardDescription>
          Связь с трендами площадки — только рекомендации, без автодействий.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection.demandHeadline ? (
          <p className="text-sm text-muted-foreground">{connection.demandHeadline}</p>
        ) : null}
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
