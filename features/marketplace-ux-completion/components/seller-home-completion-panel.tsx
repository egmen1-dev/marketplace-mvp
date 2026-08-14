"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  aiExplanationFromNextStep,
} from "@/lib/marketplace-ux-completion/seller-home";
import {
  trackAiExplanationView,
  trackSellerDashboardActionClick,
} from "@/lib/marketplace-ux-completion/analytics";
import type { SellerHomeSummary } from "@/lib/marketplace-ux-completion/types";

type SellerHomeCompletionPanelProps = {
  summary: SellerHomeSummary;
};

export function SellerHomeCompletionPanel({ summary }: SellerHomeCompletionPanelProps) {
  const explanation = aiExplanationFromNextStep(summary.nextStep);

  useEffect(() => {
    if (explanation) trackAiExplanationView(explanation.title);
  }, [explanation?.title]);

  if (!summary.enabled) return null;

  return (
    <div className="flex flex-col gap-6" data-testid="seller-home-completion">
      <div className="grid gap-3 sm:grid-cols-3">
        {summary.stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="font-heading text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {summary.attention.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">⚠️ Что требует внимания</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {summary.attention.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {explanation ? (
        <div className="rounded-2xl border border-border bg-card p-5" data-testid="ai-explanation-card">
          <p className="text-sm font-medium text-primary">Ваш следующий шаг</p>
          <h3 className="mt-2 font-heading text-lg font-semibold">{explanation.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Почему: </span>
            {explanation.why}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Результат: </span>
            {explanation.result}
          </p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={
              <Link
                href={explanation.ctaHref}
                onClick={() => trackSellerDashboardActionClick(explanation.title)}
              />
            }
          >
            {explanation.ctaLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
