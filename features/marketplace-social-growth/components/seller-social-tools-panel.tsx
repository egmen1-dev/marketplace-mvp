"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { generateViralContentAction } from "@/lib/marketplace-social-growth/actions";
import type { SellerSocialTools, ViralContent } from "@/lib/marketplace-social-growth/types";

type SellerSocialToolsPanelProps = {
  tools: SellerSocialTools;
};

export function SellerSocialToolsPanel({ tools }: SellerSocialToolsPanelProps) {
  const [content, setContent] = useState<ViralContent | null>(null);
  const [pending, startTransition] = useTransition();

  if (!tools.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_SOCIAL_GROWTH_ENABLED=false
      </p>
    );
  }

  function generate(formatId: import("@/lib/marketplace-social-growth/types").ViralFormatId) {
    startTransition(async () => {
      setContent(await generateViralContentAction({ productId: tools.productId, formatId }));
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6" data-testid="seller-social-tools">
      <h2 className="font-heading text-lg font-semibold">
        Продвигайте товар бесплатно
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Создать контент для: {tools.productTitle || "товара"}
      </p>

      {!tools.canGenerate && tools.blockers.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {tools.blockers.map((b) => (
            <li key={b}>○ {b}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {tools.options.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !tools.canGenerate}
            onClick={() => generate(opt.formatId)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {content ? (
        <div className="mt-4 rounded-xl bg-surface/60 p-4 text-sm">
          <p className="font-medium">{content.headline}</p>
          <p className="mt-1 text-muted-foreground">{content.body}</p>
          <ul className="mt-2 space-y-1">
            {content.bullets.map((b) => (
              <li key={b}>✓ {b}</li>
            ))}
          </ul>
          {!content.allowed ? (
            <p className="mt-2 text-destructive">{content.blockers.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
