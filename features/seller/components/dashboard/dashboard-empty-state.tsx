import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-8 text-center",
        className,
      )}
      role="status"
    >
      <div
        className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        aria-hidden
      >
        {icon}
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
