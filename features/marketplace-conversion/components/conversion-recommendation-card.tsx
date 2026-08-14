"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  trackConversionActionClick,
  trackConversionProblemView,
} from "@/lib/marketplace-conversion/analytics";
import type { ConversionRecommendation } from "@/lib/marketplace-conversion/recommendations";

type ConversionRecommendationCardProps = {
  recommendation: ConversionRecommendation;
};

export function ConversionRecommendationCard({
  recommendation,
}: ConversionRecommendationCardProps) {
  useEffect(() => {
    trackConversionProblemView(recommendation.id);
  }, [recommendation.id]);

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid={`conversion-problem-${recommendation.id}`}
    >
      <p className="font-medium">{recommendation.problem}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Почему: </span>
        {recommendation.why}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Данные: </span>
        {recommendation.data}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Что сделать: </span>
        {recommendation.action}
      </p>
      {recommendation.checks && recommendation.checks.length > 0 ? (
        <ul className="mt-2 text-sm text-muted-foreground">
          <li className="font-medium text-foreground">Проверьте:</li>
          {recommendation.checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
      {recommendation.ctaHref && recommendation.ctaLabel ? (
        <Button
          className="mt-3"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={recommendation.ctaHref}
              onClick={() => trackConversionActionClick(recommendation.id)}
            />
          }
        >
          {recommendation.ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
