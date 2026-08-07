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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ProductSuggestItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type HeaderSearchProps = {
  className?: string;
  /** Compact icon trigger (mobile / overflow). */
  variant?: "icon" | "bar";
};

const DEBOUNCE_MS = 280;

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

function SuggestList({
  items,
  loading,
  onPick,
  listId,
}: {
  items: ProductSuggestItem[];
  loading: boolean;
  onPick: () => void;
  listId: string;
}) {
  if (!loading && items.length === 0) return null;

  const categories = items.filter((i) => i.type === "category");
  const products = items.filter((i) => i.type === "product");

  return (
    <ul
      id={listId}
      role="listbox"
      className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-card"
      data-testid="search-suggest"
    >
      {loading && items.length === 0 ? (
        <li className="px-3.5 py-2.5 text-sm text-muted-foreground">
          Ищем…
        </li>
      ) : null}
      {categories.length > 0 ? (
        <li className="px-3.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Категории
        </li>
      ) : null}
      {categories.map((item) => (
        <li key={`${item.type}-${item.id}`} role="option" aria-selected={false}>
          <Link
            href={item.href}
            onClick={onPick}
            className="flex flex-col gap-0.5 px-3.5 py-2 text-sm transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
          >
            <span className="font-medium text-foreground">{item.title}</span>
          </Link>
        </li>
      ))}
      {products.length > 0 ? (
        <li className="px-3.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Товары
        </li>
      ) : null}
      {products.map((item) => (
        <li key={`${item.type}-${item.id}`} role="option" aria-selected={false}>
          <Link
            href={item.href}
            onClick={onPick}
            className="flex flex-col gap-0.5 px-3.5 py-2 text-sm transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
          >
            <span className="font-medium text-foreground">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HeaderSearch({
  className,
  variant = "icon",
}: HeaderSearchProps) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { items, loading } = useDebouncedSuggest(q);
  const wrapRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      const href = trimmed
        ? `${ROUTES.CATALOG}?q=${encodeURIComponent(trimmed)}`
        : ROUTES.CATALOG;
      router.push(href);
    },
    [router],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
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

  if (variant === "bar") {
    return (
      <div ref={wrapRef} className={cn("relative w-full min-w-0", className)}>
        <form onSubmit={onSubmit} role="search" className="relative flex w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder="Искать товары…"
            aria-label="Поиск товаров"
            aria-autocomplete="list"
            aria-controls={listId}
            autoComplete="off"
            className="h-10 rounded-xl border-border/80 bg-surface-elevated pl-10 pr-24 text-sm placeholder:text-muted-foreground/70 focus-visible:shadow-glow"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute top-1/2 right-1.5 h-7 -translate-y-1/2 rounded-lg px-3"
          >
            Найти
          </Button>
        </form>
        {showSuggest ? (
          <SuggestList
            listId={listId}
            items={items}
            loading={loading}
            onPick={() => {
              setSuggestOpen(false);
              setQ("");
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-header"
            className={cn("text-muted-foreground", className)}
            aria-label="Поиск"
            data-testid="header-search-mobile"
          />
        }
      >
        <Search />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поиск товаров</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <form onSubmit={onSubmit} className="flex gap-2" role="search">
            <Input
              name="q"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              placeholder="Найти в каталоге…"
              autoFocus
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listId}
              className="flex-1"
            />
            <Button type="submit">Найти</Button>
          </form>
          {showSuggest ? (
            <SuggestList
              listId={listId}
              items={items}
              loading={loading}
              onPick={() => {
                setSuggestOpen(false);
                setOpen(false);
                setQ("");
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
