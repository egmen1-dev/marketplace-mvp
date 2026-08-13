"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductSuggestItem } from "@/features/products/types";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 280;

const POPULAR_CHIPS = [
  "перфоратор",
  "смартфон",
  "ноутбук",
  "наушники",
  "пылесос",
] as const;

function useDebouncedSuggest(query: string) {
  const [items, setItems] = useState<ProductSuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(
          `/api/products/suggest?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal },
        );
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = (await res.json()) as { items?: ProductSuggestItem[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setItems([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  return { items, loading };
}

type HeroSearchProps = {
  className?: string;
};

/**
 * Primary homepage search — large input, chips, autocomplete, analytics.
 */
export function HeroSearch({ className }: HeroSearchProps) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchStarted = useRef(false);
  const [q, setQ] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { items, loading } = useDebouncedSuggest(q);

  const navigate = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length >= 2) {
        trackEvent({
          event: ANALYTICS_EVENTS.SEARCH_USED,
          route: ROUTES.HOME,
          entityId: trimmed.slice(0, 100),
        });
      }
      const href = trimmed
        ? `${ROUTES.CATALOG}?q=${encodeURIComponent(trimmed)}`
        : ROUTES.CATALOG;
      router.push(href);
    },
    [router],
  );

  function onSearchStart() {
    if (searchStarted.current) return;
    searchStarted.current = true;
    trackEvent({
      event: ANALYTICS_EVENTS.SEARCH_START,
      route: ROUTES.HOME,
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuggestOpen(false);
    navigate(q);
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showSuggest = suggestOpen && q.trim().length >= 2;

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={onSubmit}
        role="search"
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => {
              setSuggestOpen(true);
              onSearchStart();
            }}
            placeholder="Найти товар, бренд или категорию"
            aria-label="Поиск товаров"
            aria-autocomplete="list"
            aria-controls={showSuggest ? listId : undefined}
            aria-expanded={showSuggest}
            autoComplete="off"
            data-testid="home-hero-search"
            className="h-14 rounded-2xl border-border bg-surface-elevated pl-12 text-base shadow-card placeholder:text-muted-foreground/80 focus-visible:shadow-glow sm:text-lg"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-14 shrink-0 rounded-2xl px-8 text-base"
        >
          Найти
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {POPULAR_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
            onClick={() => {
              onSearchStart();
              setQ(chip);
              navigate(chip);
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {showSuggest ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-card sm:right-auto sm:left-0 sm:max-w-[calc(100%-7.5rem)]"
        >
          {loading && items.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-muted-foreground">
              Ищем…
            </li>
          ) : null}
          {!loading && items.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-muted-foreground">
              Ничего не найдено — попробуйте другой запрос
            </li>
          ) : null}
          {items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              role="option"
              aria-selected={false}
            >
              <Link
                href={item.href}
                onClick={() => {
                  setSuggestOpen(false);
                  setQ("");
                }}
                className="flex flex-col gap-0.5 px-3.5 py-2 text-sm transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
              >
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {item.type === "category" ? "Категория" : "Товар"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
