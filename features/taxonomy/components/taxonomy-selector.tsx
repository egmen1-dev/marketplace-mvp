"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type TaxonomySuggestion = {
  productTypeId: string;
  name: string;
  breadcrumb: string[];
  confidence: number;
  matchedTerms: string[];
};

export type SelectedProductType = {
  id: string;
  name: string;
  categoryId: string;
  breadcrumb: string[];
};

type TaxonomySelectorProps = {
  productTitle: string;
  value: SelectedProductType | null;
  onChange: (next: SelectedProductType | null) => void;
  error?: string;
  disabled?: boolean;
};

export function TaxonomySelector({
  productTitle,
  value,
  onChange,
  error,
  disabled,
}: TaxonomySelectorProps) {
  const [suggestions, setSuggestions] = useState<TaxonomySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");

  useEffect(() => {
    const q = productTitle.trim();
    if (q.length < 3 || value) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/taxonomy/suggest?q=${encodeURIComponent(q)}&limit=5`,
        );
        const data = (await res.json()) as { results: TaxonomySuggestion[] };
        setSuggestions(data.results ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [productTitle, value]);

  const pick = useCallback(
    async (productTypeId: string, fallbackName?: string, crumb?: string[]) => {
      try {
        const res = await fetch(
          `/api/taxonomy/browse?productTypeId=${encodeURIComponent(productTypeId)}`,
        );
        if (!res.ok) return;
        const detail = (await res.json()) as {
          id: string;
          name: string;
          categoryId: string;
          breadcrumb: string[];
        };
        onChange({
          id: detail.id,
          name: detail.name,
          categoryId: detail.categoryId,
          breadcrumb: detail.breadcrumb,
        });
        setManualOpen(false);
      } catch {
        if (fallbackName) {
          onChange({
            id: productTypeId,
            name: fallbackName,
            categoryId: "",
            breadcrumb: crumb ?? [fallbackName],
          });
        }
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Тип товара</Label>
        {!disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setManualOpen(true)}
          >
            Выбрать вручную
          </Button>
        ) : null}
      </div>

      {value ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">
                {value.breadcrumb.slice(0, -1).join(" → ") || "Категория"}
              </p>
              <p className="font-medium">{value.name}</p>
            </div>
            {!disabled ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => onChange(null)}
                aria-label="Сбросить тип товара"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Подбираем категорию…</p>
          ) : null}
          {suggestions.length > 0 ? (
            <>
              <p className="text-sm font-medium">Мы рекомендуем</p>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={s.productTypeId}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        pick(s.productTypeId, s.name, s.breadcrumb)
                      }
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:border-foreground/30",
                        i === 0 && "border-foreground/40 bg-muted/40",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          i === 0 ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted-foreground">
                          {s.breadcrumb.slice(0, -1).join(" → ")}
                        </span>
                        <span className="font-medium">{s.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          совпадение {(s.confidence * 100).toFixed(0)}%
                          {s.matchedTerms.length
                            ? ` · ${s.matchedTerms.join(", ")}`
                            : ""}
                        </span>
                      </span>
                      <span className="text-xs text-primary">Выбрать</span>
                    </button>
                  </li>
                ))}
              </ul>
              {suggestions.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Похожие варианты выше — выберите подходящий тип.
                </p>
              ) : null}
            </>
          ) : productTitle.trim().length >= 3 && !loading ? (
            <p className="text-sm text-muted-foreground">
              Не нашли точного совпадения. Выберите тип вручную.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Введите название товара — подскажем категорию.
            </p>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {manualOpen ? (
        <ManualCategoryBrowser
          query={manualQuery}
          onQueryChange={setManualQuery}
          onPick={(id, name, crumb) => pick(id, name, crumb)}
          onClose={() => setManualOpen(false)}
        />
      ) : null}
    </div>
  );
}

type BrowseChild = {
  id: string;
  name: string;
  slug: string;
  _count: { children: number; productTypes: number };
};

type BrowseType = {
  id: string;
  name: string;
  breadcrumb: string[];
};

function ManualCategoryBrowser({
  query,
  onQueryChange,
  onPick,
  onClose,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (id: string, name: string, crumb: string[]) => void;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<
    Array<{ id: string | null; name: string }>
  >([{ id: null, name: "Главная" }]);
  const [children, setChildren] = useState<BrowseChild[]>([]);
  const [types, setTypes] = useState<BrowseType[]>([]);
  const [searchHits, setSearchHits] = useState<TaxonomySuggestion[]>([]);

  const current = stack[stack.length - 1];

  useEffect(() => {
    const parentParam =
      current.id == null ? "root" : encodeURIComponent(current.id);
    void fetch(`/api/taxonomy/browse?categoryId=${parentParam}`)
      .then((r) => r.json())
      .then((data: { children: BrowseChild[]; productTypes: BrowseType[] }) => {
        setChildren(data.children ?? []);
        setTypes(data.productTypes ?? []);
      });
  }, [current.id]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(() => {
      void fetch(
        `/api/taxonomy/suggest?mode=search&q=${encodeURIComponent(query)}&limit=12`,
      )
        .then((r) => r.json())
        .then((d: { results: TaxonomySuggestion[] }) =>
          setSearchHits(d.results ?? []),
        );
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор категории"
    >
      <div className="flex h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-background shadow-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-heading font-semibold">Категории</p>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Поиск внутри категорий"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              aria-label="Поиск категорий"
            />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {stack.map((s) => s.name).join(" → ")}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {searchHits.length > 0 ? (
            <ul className="space-y-1">
              {searchHits.map((h) => (
                <li key={h.productTypeId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                    onClick={() =>
                      onPick(h.productTypeId, h.name, h.breadcrumb)
                    }
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground">
                        {h.breadcrumb.slice(0, -1).join(" → ")}
                      </span>
                      <span className="font-medium">{h.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {stack.length > 1 ? (
                <button
                  type="button"
                  className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => setStack((s) => s.slice(0, -1))}
                >
                  ← Назад
                </button>
              ) : null}
              <ul className="space-y-0.5">
                {children.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                      onClick={() =>
                        setStack((s) => [...s, { id: c.id, name: c.name }])
                      }
                    >
                      <span>{c.name}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
                {types.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                      onClick={() => onPick(t.id, t.name, t.breadcrumb)}
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-primary">Выбрать</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!children.length && !types.length ? (
                <p className="px-3 py-6 text-sm text-muted-foreground">
                  В этой ветке пока нет типов товара.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
