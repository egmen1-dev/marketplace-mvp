"use client";

import Link from "next/link";

import type { SeoLink } from "@/lib/seo/linking";
import { cn } from "@/lib/utils";

export function SeoRelatedLinks({
  title = "Смотрите также",
  links,
  className,
}: {
  title?: string;
  links: SeoLink[];
  className?: string;
}) {
  if (!links.length) return null;
  return (
    <section
      className={cn("rounded-xl border border-border bg-muted/20 p-4", className)}
      data-testid="seo-related-links"
    >
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={`${l.kind}-${l.href}`}>
            <Link
              href={l.href}
              className="inline-flex rounded-lg bg-surface px-2.5 py-1 text-sm ring-1 ring-border transition-colors hover:text-primary hover:ring-primary/40"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
