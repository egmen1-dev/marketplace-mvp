"use client";

import Link from "next/link";
import { useEffect } from "react";

import { trackSettingsOpened } from "@/lib/marketplace-ux-completion/analytics";
import type { SettingsUxView } from "@/lib/marketplace-ux-completion/types";

type SettingsCompletionPanelProps = {
  view: SettingsUxView;
};

export function SettingsCompletionPanel({ view }: SettingsCompletionPanelProps) {
  useEffect(() => {
    if (view.enabled) trackSettingsOpened();
  }, [view.enabled]);

  if (!view.enabled) return null;

  return (
    <div className="flex flex-col gap-6" data-testid="settings-completion-panel">
      <div className="rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Email: </span>
        <span className="font-medium">{view.email}</span>
      </div>
      {view.sections.map((section) => (
        <section key={section.id} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">
            {section.emoji} {section.title}
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {section.items.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.hint ? (
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  ) : null}
                </div>
                <Link href={item.href} className="text-sm text-primary hover:underline">
                  Открыть
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
