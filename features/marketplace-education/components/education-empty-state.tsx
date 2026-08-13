import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { emptyStateEducation } from "@/lib/marketplace-education/checklists";

type EducationEmptyStateProps = {
  surface: "favorites" | "sales" | "reviews" | "products";
  icon?: ReactNode;
};

export function EducationEmptyState({ surface, icon }: EducationEmptyStateProps) {
  const copy = emptyStateEducation({ surface });

  return (
    <div
      className="animate-fade-up flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center"
      data-testid={`education-empty-${surface}`}
    >
      {icon}
      <div>
        <p className="font-heading text-lg font-medium">{copy.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      </div>
      {copy.href && copy.ctaLabel ? (
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={copy.href} />}
        >
          {copy.ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
