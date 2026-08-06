"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Car,
  Check,
  Dumbbell,
  Hammer,
  Home,
  Laptop,
  Search,
  Shirt,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryListItem } from "@/features/catalog/queries";
import {
  buildCategoryPathLabel,
  collectAncestorIds,
  searchCategories,
} from "@/features/catalog/tree";
import { cn } from "@/lib/utils";

const ROOT_ICONS: Record<string, LucideIcon> = {
  construction: Hammer,
  tools: Wrench,
  electronics: Laptop,
  home: Home,
  auto: Car,
  clothing: Shirt,
  beauty: Sparkles,
  sport: Dumbbell,
};

type CategoryPickerProps = {
  categories: CategoryListItem[];
  value: string;
  onChange: (categoryId: string) => void;
  error?: string;
  disabled?: boolean;
};

type WizardStep = 1 | 2 | 3;

function iconForSlug(slug: string): LucideIcon {
  return ROOT_ICONS[slug] ?? Wrench;
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  error,
  disabled,
}: CategoryPickerProps) {
  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, CategoryListItem[]>();
    for (const c of categories) {
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  }, [categories]);

  const roots = childrenOf.get(null) ?? [];

  const initialPath = useMemo(() => {
    if (!value) return { l1: "", l2: "", l3: "", step: 1 as WizardStep };
    const cat = byId.get(value);
    if (!cat) return { l1: "", l2: "", l3: "", step: 1 as WizardStep };
    const ancestors = collectAncestorIds(categories, value);
    if (ancestors.length === 0) {
      return { l1: value, l2: "", l3: "", step: 1 as WizardStep };
    }
    if (ancestors.length === 1) {
      return {
        l1: ancestors[0]!,
        l2: value,
        l3: "",
        step: 2 as WizardStep,
      };
    }
    return {
      l1: ancestors[0]!,
      l2: ancestors[1]!,
      l3: value,
      step: 3 as WizardStep,
    };
  }, [byId, categories, value]);

  const [step, setStep] = useState<WizardStep>(initialPath.step);
  const [l1, setL1] = useState(initialPath.l1);
  const [l2, setL2] = useState(initialPath.l2);
  const [search, setSearch] = useState("");

  const l2Options = useMemo(
    () => (l1 ? (childrenOf.get(l1) ?? []) : []),
    [childrenOf, l1],
  );
  const l3Options = useMemo(
    () => (l2 ? (childrenOf.get(l2) ?? []) : []),
    [childrenOf, l2],
  );

  const pathLabel = value
    ? buildCategoryPathLabel(categories, value)
    : "";

  const searchHits = useMemo(
    () =>
      searchCategories(
        categories.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
          level: c.level,
        })),
        search,
      ),
    [categories, search],
  );

  const isSearching = search.trim().length > 0;

  function pickRoot(id: string) {
    setL1(id);
    setL2("");
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      onChange(id);
      setStep(1);
      return;
    }
    onChange("");
    setStep(2);
  }

  function pickL2(id: string) {
    setL2(id);
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      onChange(id);
      setStep(2);
      return;
    }
    onChange("");
    setStep(3);
  }

  function pickL3(id: string) {
    onChange(id);
  }

  function pickSearchHit(id: string) {
    const cat = byId.get(id);
    if (!cat) return;
    const ancestors = collectAncestorIds(categories, id);
    setL1(ancestors[0] ?? (cat.parentId == null ? id : ""));
    if (ancestors.length === 0) {
      setL2("");
      setStep(1);
    } else if (ancestors.length === 1) {
      setL2(id);
      setStep(2);
    } else {
      setL2(ancestors[1] ?? "");
      setStep(3);
    }
    onChange(id);
    setSearch("");
  }

  function goBack() {
    if (step === 3) {
      onChange("");
      setStep(2);
      return;
    }
    if (step === 2) {
      setL2("");
      onChange("");
      setStep(1);
    }
  }

  function clearSelection() {
    setL1("");
    setL2("");
    onChange("");
    setStep(1);
    setSearch("");
  }

  const stepTitle =
    step === 1
      ? "Выберите категорию"
      : step === 2
        ? "Подкатегория"
        : "Тип товара";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Категория</Label>
        {value ? (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Поиск, например «тепловая»'
          disabled={disabled}
          className="pl-9"
          aria-label="Поиск категории"
        />
      </div>

      {pathLabel ? (
        <p
          className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground"
          data-testid="category-path"
        >
          <span className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          {pathLabel}
        </p>
      ) : null}

      {isSearching ? (
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface">
          {searchHits.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              Ничего не найдено
            </li>
          ) : (
            searchHits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => pickSearchHit(hit.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10",
                    value === hit.id && "bg-primary/10",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {hit.name}
                    {hit.isLeaf ? (
                      <span className="ml-1.5 text-[10px] font-normal tracking-wide text-primary uppercase">
                        тип
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {hit.pathLabel}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="mb-3 flex items-center gap-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={goBack}
                className="h-8 gap-1 px-2"
              >
                <ArrowLeft className="size-3.5" />
                Назад
              </Button>
            ) : null}
            <p className="text-sm font-medium text-foreground">{stepTitle}</p>
            <span className="ml-auto text-xs text-muted-foreground">
              Шаг {step} из 3
            </span>
          </div>

          {step === 1 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {roots.map((cat) => {
                const Icon = iconForSlug(cat.slug);
                const selected = l1 === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickRoot(cat.id)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm leading-snug font-medium">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {l2Options.map((cat) => {
                const selected = l2 === cat.id || value === cat.id;
                const hasKids = (childrenOf.get(cat.id) ?? []).length > 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickL2(cat.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {hasKids ? "Есть типы товаров" : "Выбрать как категорию"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {l3Options.map((cat) => {
                const selected = value === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickL3(cat.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    <span className="text-sm font-medium">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
