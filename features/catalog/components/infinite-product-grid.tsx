"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { CATALOG_PAGE_SIZE } from "@/features/catalog/url";
import { ProductCard } from "@/features/products/components/product-card";
import type { ProductListItem, ProductListResult } from "@/features/products/types";
import { cn } from "@/lib/utils";

/** Serializable filters for GET /api/products (catalog append). */
export type InfiniteCatalogQuery = {
  q?: string;
  category?: string;
  city?: string;
  seller?: string;
  sellerKind?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  productType?: string;
  brand?: string;
  facets?: Array<{ slug: string; value: string }>;
  sort?: string;
};

type InfiniteProductGridProps = {
  initialItems: ProductListItem[];
  /** First loaded page (usually 1). */
  initialPage: number;
  total: number;
  pageSize?: number;
  query: InfiniteCatalogQuery;
  className?: string;
};

function buildApiUrl(
  query: InfiniteCatalogQuery,
  page: number,
  pageSize: number,
): string {
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("pageSize", String(pageSize));
  sp.set("status", "ACTIVE");
  if (query.q) sp.set("q", query.q);
  if (query.category) sp.set("category", query.category);
  if (query.city) sp.set("city", query.city);
  if (query.seller) sp.set("seller", query.seller);
  if (query.sellerKind) sp.set("sellerKind", query.sellerKind);
  if (query.condition) sp.set("condition", query.condition);
  if (query.priceMin != null) sp.set("priceMin", String(query.priceMin));
  if (query.priceMax != null) sp.set("priceMax", String(query.priceMax));
  if (query.inStock) sp.set("inStock", "1");
  if (query.productType) sp.set("productType", query.productType);
  if (query.brand) sp.set("brand", query.brand);
  for (const f of query.facets ?? []) {
    if (f.slug && f.value) sp.set(`f_${f.slug}`, f.value);
  }
  if (query.sort && query.sort !== "popular") sp.set("sort", query.sort);
  return `/api/products?${sp.toString()}`;
}

export function InfiniteProductGrid({
  initialItems,
  initialPage,
  total,
  pageSize = CATALOG_PAGE_SIZE,
  query,
  className,
}: InfiniteProductGridProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(
    initialItems.length === 0 || initialItems.length >= total,
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const stateRef = useRef({ items, page, exhausted, total, query, pageSize });
  stateRef.current = { items, page, exhausted, total, query, pageSize };

  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setError(null);
    setExhausted(initialItems.length === 0 || initialItems.length >= total);
  }, [initialItems, initialPage, total]);

  const loadMore = useCallback(async () => {
    const snap = stateRef.current;
    if (inFlightRef.current || snap.exhausted) return;

    const nextPage = snap.page + 1;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(
        buildApiUrl(snap.query, nextPage, snap.pageSize),
        {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) {
        throw new Error("Не удалось загрузить ещё товары");
      }
      const data = (await res.json()) as ProductListResult;
      const incoming = data.items ?? [];
      const seen = new Set(snap.items.map((p) => p.id));
      const appended = incoming.filter((p) => !seen.has(p.id));
      const nextCount = snap.items.length + appended.length;

      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const extra = incoming.filter((p) => !ids.has(p.id));
        return extra.length > 0 ? [...prev, ...extra] : prev;
      });
      setPage(nextPage);

      if (
        incoming.length === 0 ||
        nextCount >= (data.total ?? snap.total) ||
        nextPage >= (data.totalPages ?? nextPage)
      ) {
        setExhausted(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить ещё товары",
      );
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || exhausted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [exhausted, page, items.length, loadMore]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            imagePriority={index < 4}
            style={
              index < initialItems.length
                ? { animationDelay: `${80 + index * 40}ms` }
                : undefined
            }
          />
        ))}
      </div>

      <div
        ref={sentinelRef}
        data-testid="catalog-infinite-sentinel"
        className="flex min-h-10 flex-col items-center justify-center gap-2 py-4"
        aria-hidden={exhausted && !loading}
      >
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Загружаем ещё…
          </p>
        ) : null}
        {error ? (
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => void loadMore()}
          >
            {error}. Повторить
          </button>
        ) : null}
        {exhausted && !loading && items.length > 0 ? (
          <p className="text-sm text-muted-foreground">Все объявления загружены</p>
        ) : null}
      </div>
    </div>
  );
}
