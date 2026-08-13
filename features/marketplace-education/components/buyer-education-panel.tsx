"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { BuyerEducationTopic } from "@/lib/marketplace-education/types";

type BuyerEducationPanelProps = {
  topics: BuyerEducationTopic[];
  productId: string;
};

export function BuyerEducationPanel({
  topics,
  productId,
}: BuyerEducationPanelProps) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.EDUCATION_VIEW,
      route: `/product/${productId}`,
    });
  }, [productId]);

  if (topics.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5"
      data-testid="buyer-education-panel"
    >
      <h2 className="font-heading text-base font-semibold tracking-tight">
        Помощь при покупке
      </h2>
      <ul className="mt-3 space-y-3">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="rounded-xl bg-surface/60 px-3 py-2.5 text-sm"
            data-testid={`buyer-education-${topic.id}`}
          >
            <p className="font-medium text-foreground">{topic.title}</p>
            <p className="mt-1 text-muted-foreground">{topic.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
