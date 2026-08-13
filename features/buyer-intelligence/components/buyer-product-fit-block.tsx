"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { BuyerProductMatch } from "@/lib/buyer-intelligence/types";

type BuyerProductFitBlockProps = {
  match: BuyerProductMatch;
  productId: string;
};

/** PDP advisory fit block — not used for ranking. */
export function BuyerProductFitBlock({
  match,
  productId,
}: BuyerProductFitBlockProps) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.BUYER_MATCH_SCORE,
      route: `/product/${productId}`,
      entityId: String(match.matchScore),
    });
  }, [match.matchScore, productId]);

  if (match.matchScore < 30) return null;

  return (
    <Card
      className="border-primary/20 bg-primary/5"
      data-testid="buyer-product-fit-block"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">
            Почему этот товар вам подходит
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {match.matchScore}%
          </Badge>
        </div>
        <CardDescription>
          Персональная оценка — не влияет на позицию в поиске.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {match.reasons.map((reason) => (
            <li key={reason}>✓ {reason}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
