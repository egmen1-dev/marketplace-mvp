import Link from "next/link";
import type { RiskEvent } from "@prisma/client";

import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SEVERITY_CLASS: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  CRITICAL: "bg-destructive/15 text-destructive",
};

type Props = {
  event: RiskEvent;
  onResolve: (formData: FormData) => void;
};

/** Admin risk-event row: explainability + entity links + resolution actions. */
export function RiskEventRow({ event, onResolve }: Props) {
  const entityLinks: { label: string; href: string }[] = [];
  if (event.productId)
    entityLinks.push({ label: "Товар", href: `${ROUTES.ADMIN_RISK}/product/${event.productId}` });
  if (event.sellerId)
    entityLinks.push({ label: "Продавец", href: `${ROUTES.ADMIN_RISK}/seller/${event.sellerId}` });
  if (event.userId)
    entityLinks.push({ label: "Покупатель", href: `${ROUTES.ADMIN_RISK}/user/${event.userId}` });

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/40 p-4"
      data-testid="risk-event"
      data-type={event.type}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            SEVERITY_CLASS[event.severity] ?? SEVERITY_CLASS.LOW,
          )}
        >
          {event.severity}
        </span>
        <span className="font-medium">{event.type}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{event.status}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          риск +{event.scoreDelta} · уверенность {event.confidence}%
        </span>
      </div>

      {event.reason ? (
        <p className="text-sm text-foreground/90">{event.reason}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {entityLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/40"
          >
            {l.label} →
          </Link>
        ))}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {(["reviewed", "confirm", "dismiss", "escalate"] as const).map((action) => (
            <form key={action} action={onResolve}>
              <input type="hidden" name="riskEventId" value={event.id} />
              <input type="hidden" name="action" value={action} />
              <button
                type="submit"
                data-testid={`risk-resolve-${action}`}
                className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/40"
              >
                {action === "reviewed"
                  ? "Проверено"
                  : action === "confirm"
                    ? "Подтвердить"
                    : action === "dismiss"
                      ? "Отклонить"
                      : "Эскалация"}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
