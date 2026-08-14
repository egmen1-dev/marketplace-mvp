"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { SellerTrustCenterSnapshot } from "@/lib/marketplace-trust-experience/types";

import { TrustCenterViewTracker, TrustLevelReachedTracker } from "./trust-center-trackers";

type SellerTrustCenterPanelProps = {
  center: SellerTrustCenterSnapshot;
  sellerId: string;
};

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

export function SellerTrustCenterPanel({ center, sellerId }: SellerTrustCenterPanelProps) {
  const [openFactor, setOpenFactor] = useState<string | null>(center.factors[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-6" data-testid="seller-trust-center">
      <TrustCenterViewTracker sellerId={sellerId} />
      <TrustLevelReachedTracker levelId={center.level.id} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{center.trustScoreLabel}</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <p className="font-heading text-4xl font-semibold tabular-nums">
            {center.trustScore}
            <span className="text-2xl text-muted-foreground"> / 100</span>
          </p>
          <p className="pb-1 text-sm font-medium">
            {center.level.icon} {center.level.label}
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-muted/30 px-4 py-3 text-sm">
          <p className="text-muted-foreground">За последние {center.trend.windowDays} дней:</p>
          <p className="mt-1 font-medium">
            {center.trend.direction === "up"
              ? "↑"
              : center.trend.direction === "down"
                ? "↓"
                : "→"}{" "}
            {formatDelta(center.trend.delta)} пункта
          </p>
          {center.trend.mainReason ? (
            <p className="mt-2 text-muted-foreground">
              Главная причина: {center.trend.mainReason}
            </p>
          ) : null}
        </div>
      </section>

      {center.nextStep ? (
        <section
          className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5"
          data-testid="trust-next-step"
        >
          <p className="font-medium">Следующий шаг</p>
          <p className="mt-2 font-heading text-lg font-semibold">{center.nextStep.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Почему: </span>
            {center.nextStep.why}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Ожидаемый эффект: </span>
            {center.nextStep.expectedEffect}
          </p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={
              <Link
                href={center.nextStep.ctaHref}
                onClick={() =>
                  trackEvent({
                    event: ANALYTICS_EVENTS.TRUST_IMPROVEMENT_CLICK,
                    entityId: center.nextStep!.title,
                    route: "/account/reputation",
                  })
                }
              />
            }
          >
            {center.nextStep.ctaLabel}
          </Button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="font-medium">Ваш рейтинг состоит из:</p>
        <div className="mt-4 flex flex-col gap-3">
          {center.factors.map((factor) => {
            const isOpen = openFactor === factor.id;
            return (
              <div key={factor.id} className="rounded-xl border border-border/70">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => {
                    setOpenFactor(isOpen ? null : factor.id);
                    trackEvent({
                      event: ANALYTICS_EVENTS.TRUST_FACTOR_OPEN,
                      entityId: factor.id,
                      route: "/account/reputation",
                    });
                  }}
                  data-testid={`trust-factor-${factor.id}`}
                >
                  <div>
                    <p className="font-medium">{factor.name}</p>
                    <p className="text-xs text-muted-foreground">{factor.weight}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-lg font-semibold tabular-nums">
                      {factor.score}/100
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                {isOpen ? (
                  <div className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
                    <p>{factor.summary}</p>
                    {factor.lastChange ? (
                      <div className="mt-3">
                        <p className="font-medium text-foreground">Последнее изменение:</p>
                        <p>
                          {formatDelta(factor.lastChange.delta)} · {factor.lastChange.reason}
                        </p>
                      </div>
                    ) : null}
                    {factor.improvementHint ? (
                      <p className="mt-3">
                        <span className="font-medium text-foreground">Можно улучшить: </span>
                        {factor.improvementHint}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {center.achievements.some((a) => a.unlocked) ? (
        <section className="rounded-2xl border border-border bg-card p-5" data-testid="trust-achievements">
          <p className="font-medium">Достижения</p>
          <ul className="mt-3 space-y-3">
            {center.achievements
              .filter((achievement) => achievement.unlocked)
              .map((achievement) => (
                <li key={achievement.id} className="flex gap-3 text-sm">
                  <span className="text-lg">{achievement.icon}</span>
                  <div>
                    <p className="font-medium">{achievement.title}</p>
                    <p className="text-muted-foreground">{achievement.description}</p>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {center.history.length > 0 ? (
        <section
          className="rounded-2xl border border-border bg-card p-5"
          data-testid="trust-history-timeline"
          onMouseEnter={() =>
            trackEvent({
              event: ANALYTICS_EVENTS.TRUST_HISTORY_VIEW,
              entityId: sellerId,
              route: "/account/reputation",
            })
          }
        >
          <p className="font-medium">История изменений</p>
          <ul className="mt-4 space-y-4">
            {center.history.map((entry) => (
              <li key={entry.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {entry.dateLabel}
                </p>
                <p className="mt-1 font-medium tabular-nums">
                  {entry.oldScore} → {entry.newScore}
                </p>
                <p className="text-sm font-medium text-primary">
                  {formatDelta(entry.delta)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">Совет: {entry.advice}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
