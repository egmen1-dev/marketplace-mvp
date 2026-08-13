"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { PdpTrustExperience } from "@/lib/trust-safety/types";
import { cn } from "@/lib/utils";

type PdpTrustSafetyBlockProps = {
  experience: PdpTrustExperience;
  productId: string;
  className?: string;
};

export function PdpTrustSafetyBlock({
  experience,
  productId,
  className,
}: PdpTrustSafetyBlockProps) {
  useEffect(() => {
    if (!experience.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.TRUST_VIEW,
      route: `${ROUTES.PRODUCT}/${productId}`,
      entityId: productId,
    });
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_TRUST_VIEW,
      route: `${ROUTES.PRODUCT}/${productId}`,
    });
    trackEvent({
      event: ANALYTICS_EVENTS.PRODUCT_TRUST_VIEW,
      route: `${ROUTES.PRODUCT}/${productId}`,
      entityId: productId,
    });
  }, [experience.enabled, productId]);

  if (!experience.enabled) return null;

  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border bg-card/50 p-4 sm:p-5",
        className,
      )}
      data-testid="pdp-trust-safety-block"
    >
      <TrustBlockViewTracker blockId="pdp" route={`${ROUTES.PRODUCT}/${productId}`} />

      <div>
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          {experience.title}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TrustSection
          testId="trust-seller-section"
          headline={experience.sellerSection.headline}
          bullets={experience.sellerSection.bullets}
          score={experience.sellerSection.score}
        />
        <TrustSection
          testId="trust-product-section"
          headline={experience.productSection.headline}
          bullets={experience.productSection.bullets}
          score={experience.productSection.score}
        />
        <div data-testid="trust-protection-section">
          <h3 className="text-sm font-semibold text-foreground">
            Защита покупки
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {experience.protectionSection.title}
          </p>
          <ol className="mt-3 space-y-2">
            {experience.protectionSection.steps.map((step, index) => (
              <li key={step.label} className="text-sm">
                <span className="font-medium text-foreground">
                  {index + 1}. {step.label}
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  {step.body}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {experience.riskSignals.length > 0 ? (
        <div
          className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-3"
          data-testid="trust-risk-signals"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="size-4 text-amber-600" aria-hidden />
            На что обратить внимание
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {experience.riskSignals.map((signal) => (
              <li
                key={signal.type}
                data-testid={`risk-signal-${signal.type.toLowerCase()}`}
                onMouseEnter={() =>
                  trackEvent({
                    event: ANALYTICS_EVENTS.RISK_SIGNAL_VIEW,
                    route: `${ROUTES.PRODUCT}/${productId}`,
                    entityId: signal.type,
                  })
                }
              >
                {signal.recommendation}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Оценки доверия носят информационный характер и не влияют на поиск и
        ранжирование.{" "}
        <Link
          href={ROUTES.TERMS}
          className="text-primary underline-offset-4 hover:underline"
        >
          Условия площадки
        </Link>
      </p>
    </section>
  );
}

function TrustSection({
  headline,
  bullets,
  score,
  testId,
}: {
  headline: string;
  bullets: string[];
  score: number | null;
  testId: string;
}) {
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{headline}</h3>
        {score != null ? (
          <span className="text-xs font-medium text-primary">{score}/100</span>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {bullets.length > 0 ? (
          bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="text-primary" aria-hidden>
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))
        ) : (
          <li>Данные появятся после улучшения карточки</li>
        )}
      </ul>
    </div>
  );
}
