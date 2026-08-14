"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { UxEmptyState } from "@/lib/marketplace-ux-completion/types";
import {
  trackEmptyStateActionClick,
  trackEmptyStateView,
} from "@/lib/marketplace-ux-completion/analytics";
import { useEffect } from "react";

type UxEmptyStatePanelProps = {
  state: UxEmptyState;
};

export function UxEmptyStatePanel({ state }: UxEmptyStatePanelProps) {
  useEffect(() => {
    trackEmptyStateView(state.id);
  }, [state.id]);

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center"
      data-testid={`ux-empty-state-${state.id}`}
    >
      <p className="text-3xl" aria-hidden>
        {state.emoji}
      </p>
      <div>
        <p className="font-heading text-lg font-medium">{state.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{state.body}</p>
      </div>
      {state.bullets.length > 0 ? (
        <ul className="text-sm text-muted-foreground">
          {state.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      <Button
        size="lg"
        nativeButton={false}
        render={
          <Link
            href={state.ctaHref}
            onClick={() => trackEmptyStateActionClick(state.id)}
          />
        }
      >
        {state.ctaLabel}
      </Button>
    </div>
  );
}
