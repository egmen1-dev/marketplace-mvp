"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import type { FacetWithValues } from "@/lib/catalog-taxonomy/facets";

type FacetFiltersProps = {
  categorySlug?: string;
  productType?: string;
  selected: Array<{ slug: string; value: string }>;
  onChange: (facets: Array<{ slug: string; value: string }>) => void;
  idPrefix: string;
};

export function FacetFilters({
  categorySlug,
  productType,
  selected,
  onChange,
  idPrefix,
}: FacetFiltersProps) {
  const [facets, setFacets] = useState<FacetWithValues[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedKey = selected
    .map((s) => `${s.slug}=${s.value}`)
    .sort()
    .join("&");

  useEffect(() => {
    if (!categorySlug && !productType) {
      setFacets([]);
      return;
    }
    const sp = new URLSearchParams();
    if (productType) sp.set("productType", productType);
    else if (categorySlug) sp.set("category", categorySlug);
    for (const f of selected) sp.set(`f_${f.slug}`, f.value);

    let cancelled = false;
    setLoading(true);
    fetch(`/api/catalog/facets?${sp.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setFacets(data.facets ?? []);
      })
      .catch(() => {
        if (!cancelled) setFacets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // selectedKey encodes selected facets for stable deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selected via selectedKey
  }, [categorySlug, productType, selectedKey]);

  if (!categorySlug && !productType) return null;

  function setFacet(slug: string, value: string) {
    const next = selected.filter((f) => f.slug !== slug);
    if (value) next.push({ slug, value });
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4" data-testid="catalog-facet-filters">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Характеристики
        {loading ? "…" : null}
      </p>
      {facets.length === 0 && !loading ? (
        <p className="text-xs text-muted-foreground">
          Нет фильтруемых характеристик для выбора
        </p>
      ) : null}
      {facets.map((facet) => {
        const current = selected.find((s) => s.slug === facet.slug)?.value ?? "";
        return (
          <div key={facet.id} className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-f-${facet.slug}`}>
              {facet.name}
              {facet.unit ? ` (${facet.unit})` : ""}
            </Label>
            <select
              id={`${idPrefix}-f-${facet.slug}`}
              className="h-10 w-full rounded-xl border border-input bg-surface px-3.5 text-sm outline-none focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/25"
              value={current}
              onChange={(e) => setFacet(facet.slug, e.target.value)}
            >
              <option value="">Все</option>
              {facet.values.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} ({v.count})
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
