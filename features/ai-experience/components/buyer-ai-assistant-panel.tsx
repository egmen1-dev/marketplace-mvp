"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { BuyerAiAssistantExperience } from "@/lib/ai-experience/types";

type BuyerAiAssistantPanelProps = {
  experience: BuyerAiAssistantExperience;
  productId: string;
};

export function BuyerAiAssistantPanel({
  experience,
  productId,
}: BuyerAiAssistantPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!experience.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.AI_RECOMMENDATION_VIEW,
      route: `/product/${productId}`,
    });
  }, [experience.enabled, productId]);

  if (!experience.enabled) return null;

  const active = experience.prompts.find((p) => p.id === activeId);

  return (
    <div
      className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3"
      data-testid="buyer-ai-assistant"
    >
      <p className="text-sm font-medium">{experience.headline}</p>
      {experience.matchSummary ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Buyer Intelligence: {experience.matchSummary}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {experience.prompts.map((prompt) => (
          <Button
            key={prompt.id}
            type="button"
            size="sm"
            variant={activeId === prompt.id ? "default" : "outline"}
            onClick={() =>
              setActiveId((prev) => (prev === prompt.id ? null : prompt.id))
            }
            data-testid={`buyer-ai-prompt-${prompt.id}`}
          >
            {prompt.question}
          </Button>
        ))}
      </div>
      {active ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="buyer-ai-answer">
          {active.answerPreview}
        </p>
      ) : null}
    </div>
  );
}
