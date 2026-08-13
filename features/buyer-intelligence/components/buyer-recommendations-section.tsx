"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/features/products/mappers";
import { productPagePath } from "@/lib/seo/paths";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { BuyerProductRecommendation } from "@/lib/buyer-intelligence/types";

type BuyerRecommendationsSectionProps = {
  recommendations: BuyerProductRecommendation[];
  query: string;
  route?: string;
};

/**
 * Advisory block after catalog search — does not alter organic ranking.
 */
export function BuyerRecommendationsSection({
  recommendations,
  query,
  route = "/catalog",
}: BuyerRecommendationsSectionProps) {
  useEffect(() => {
    if (recommendations.length === 0) return;
    trackEvent({
      event: ANALYTICS_EVENTS.BUYER_RECOMMENDATION_VIEW,
      route,
      entityId: query.slice(0, 100),
    });
  }, [recommendations.length, query, route]);

  if (recommendations.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      data-testid="buyer-recommendations-section"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Мы подобрали для вас
        </h2>
        <Badge variant="secondary" className="text-[10px]">
          AI совет
        </Badge>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Подборка по запросу «{query}» — отдельный блок, не меняет порядок
        органической выдачи.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((row) => (
          <Card
            key={row.productId}
            className="overflow-hidden border-border/80 bg-surface"
            data-testid={`buyer-recommendation-${row.productId}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-2 text-base font-medium">
                <Link
                  href={productPagePath(row.productId)}
                  className="hover:text-primary"
                  onClick={() =>
                    trackEvent({
                      event: ANALYTICS_EVENTS.BUYER_RECOMMENDATION_CLICK,
                      route,
                      entityId: row.productId,
                    })
                  }
                >
                  {row.title}
                </Link>
              </CardTitle>
              <p className="text-sm font-medium text-foreground">
                {formatPrice(row.price, row.currency)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  совпадение {row.matchScore}%
                </span>
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Почему подходит:
              </p>
              <ul className="space-y-1 text-sm">
                {row.reasons.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
