"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { DynamicCatalogFilter } from "@/features/taxonomy/queries";
import { cn } from "@/lib/utils";

type Props = {
  filters: DynamicCatalogFilter[];
};

/**
 * Category-specific characteristic filters (TASK 058, section 40).
 * Server-provided filter list; selections live in the URL as `ch_<slug>=v1,v2`
 * so they are shareable and SSR-friendly. Other params are preserved.
 */
export function DynamicCatalogFilters({ filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selectedFor = useCallback(
    (slug: string): Set<string> => {
      const raw = searchParams.get(`ch_${slug}`);
      return new Set(
        (raw ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      );
    },
    [searchParams],
  );

  const toggle = useCallback(
    (slug: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const current = selectedFor(slug);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      if (current.size) next.set(`ch_${slug}`, [...current].join(","));
      else next.delete(`ch_${slug}`);
      next.delete("page");
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, selectedFor],
  );

  if (!filters.length) return null;

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/40 p-4"
      data-testid="dynamic-catalog-filters"
      aria-busy={pending}
    >
      <h3 className="font-heading text-sm font-semibold">Характеристики</h3>
      {filters.map((f) => {
        const selected = selectedFor(f.slug);
        return (
          <div key={f.slug} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {f.name}
              {f.unit ? `, ${f.unit}` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {f.values.map((v) => {
                const active = selected.has(v);
                return (
                  <button
                    key={v}
                    type="button"
                    data-testid={`ch-filter-${f.slug}`}
                    aria-pressed={active}
                    disabled={pending}
                    onClick={() => toggle(f.slug, v)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
