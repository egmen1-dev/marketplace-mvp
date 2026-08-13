"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { BuyerHelpPrompt } from "@/lib/marketplace-education/types";

type BuyerSmartAssistantProps = {
  prompts: BuyerHelpPrompt[];
  productId: string;
};

/** Foundation for smart buying assistant — recommendations only, no search changes. */
export function BuyerSmartAssistant({
  prompts,
  productId,
}: BuyerSmartAssistantProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (prompts.length === 0) return null;

  const active = prompts.find((p) => p.id === activeId);

  return (
    <div
      className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3"
      data-testid="buyer-smart-assistant"
    >
      <p className="text-sm font-medium">Помочь выбрать</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt.id}
            type="button"
            size="sm"
            variant={activeId === prompt.id ? "default" : "outline"}
            onClick={() =>
              setActiveId((prev) => (prev === prompt.id ? null : prompt.id))
            }
            data-testid={`buyer-help-prompt-${prompt.id}`}
          >
            {prompt.question}
          </Button>
        ))}
      </div>
      {active ? (
        <p
          className="mt-3 text-sm text-muted-foreground"
          data-testid="buyer-help-answer"
        >
          {active.answerPreview}
        </p>
      ) : null}
    </div>
  );
}
