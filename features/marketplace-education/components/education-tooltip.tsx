"use client";

import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type EducationTooltipProps = {
  label?: string;
  title: string;
  body: string;
  tooltipId: string;
  route: string;
  className?: string;
};

/** Reusable contextual education tooltip — no separate help center. */
export function EducationTooltip({
  label,
  title,
  body,
  tooltipId,
  route,
  className,
}: EducationTooltipProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    trackEvent({
      event: ANALYTICS_EVENTS.EDUCATION_TOOLTIP_OPEN,
      route,
      entityId: tooltipId,
    });
  }, [open, route, tooltipId]);

  return (
    <span className={cn("inline-flex items-start gap-1.5", className)}>
      {label ? <span>{label}</span> : null}
      <span className="relative inline-flex">
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted"
          aria-expanded={open}
          aria-label={title}
          data-testid={`education-tooltip-${tooltipId}`}
          onClick={() => setOpen((v) => !v)}
        >
          <CircleHelp className="size-3.5" aria-hidden />
        </button>
        {open ? (
          <span
            role="tooltip"
            className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-3 text-left text-sm shadow-md"
          >
            <span className="block font-medium text-foreground">{title}</span>
            <span className="mt-1 block whitespace-pre-line text-muted-foreground">
              {body}
            </span>
          </span>
        ) : null}
      </span>
    </span>
  );
}
