import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SellerLotRecommendation } from "@/lib/marketplace-communication/types";

type SellerLotRecommendationPanelProps = {
  recommendation: SellerLotRecommendation;
};

export function SellerLotRecommendationPanel({
  recommendation,
}: SellerLotRecommendationPanelProps) {
  return (
    <Card
      className="border-violet-500/20 bg-violet-500/5"
      data-testid="seller-lot-recommendation"
    >
      <CardHeader>
        <CardTitle className="text-base">{recommendation.headline}</CardTitle>
        <CardDescription>
          Коммуникация ЛОТ — подсказка, не автоматическое изменение.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
          {recommendation.body}
        </pre>
        <Button
          size="sm"
          className="w-fit rounded-xl"
          nativeButton={false}
          render={<Link href={recommendation.href} />}
        >
          {recommendation.ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
