"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ProductCondition } from "@prisma/client";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryTreeNode } from "@/features/catalog/queries";
import {
  buildListingHref,
  CATALOG_SORT_OPTIONS,
  hasActiveCatalogFilters,
  parseCatalogParams,
  SELLER_KIND_OPTIONS,
} from "@/features/catalog/url";
import { PRODUCT_CONDITION_LABELS } from "@/features/products/mappers";
import type { ProductSellerOption } from "@/features/products/queries";
import { FacetFilters } from "@/features/catalog/components/facet-filters";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { parseFacetQueryParams } from "@/lib/catalog-taxonomy/facets";

const CONDITION_OPTIONS = Object.values(ProductCondition);

type CatalogFiltersPanelProps = {
  categoryTree: CategoryTreeNode[];
  cities: string[];
  sellers: ProductSellerOption[];
  className?: string;
  /** When on `/category/[slug]`, preselect and keep SEO path. */
  lockedCategorySlug?: string;
};

type FilterFormState = {
  q: string;
  category: string;
  subcategory: string;
  priceMin: string;
  priceMax: string;
  city: string;
  seller: string;
  sellerKind: string;
  condition: string;
  inStock: boolean;
  productType: string;
  facets: Array<{ slug: string; value: string }>;
  sort: string;
};

function stateFromSearchParams(
  sp: URLSearchParams,
  tree: CategoryTreeNode[],
): FilterFormState {
  const parsed = parseCatalogParams({
    q: sp.get("q") ?? undefined,
    category: sp.get("category") ?? undefined,
    subcategory: sp.get("subcategory") ?? undefined,
    priceMin: sp.get("priceMin") ?? undefined,
    priceMax: sp.get("priceMax") ?? undefined,
    city: sp.get("city") ?? undefined,
    seller: sp.get("seller") ?? undefined,
    sellerKind: sp.get("sellerKind") ?? undefined,
    condition: sp.get("condition") ?? undefined,
    inStock: sp.get("inStock") ?? undefined,
    productType: sp.get("productType") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    page: sp.get("page") ?? undefined,
  });

  let root = parsed.rootCategory ?? "";
  let sub = parsed.subcategory ?? "";

  // If URL only has a nested slug in `category`, resolve parent for the UI.
  if (root && !sub) {
    for (const node of tree) {
      if (node.slug === root) break;
      const child = node.children.find((c) => c.slug === root);
      if (child) {
        root = node.slug;
        sub = child.slug;
        break;
      }
      for (const mid of node.children) {
        const leaf = mid.children.find((c) => c.slug === root);
        if (leaf) {
          root = node.slug;
          sub = leaf.slug;
          break;
        }
      }
    }
  }

  return {
    q: parsed.q ?? "",
    category: root,
    subcategory: sub,
    priceMin: parsed.priceMin != null ? String(parsed.priceMin) : "",
    priceMax: parsed.priceMax != null ? String(parsed.priceMax) : "",
    city: parsed.city ?? "",
    seller: parsed.seller ?? "",
    sellerKind: parsed.sellerKind ?? "",
    condition: parsed.condition ?? "",
    inStock: Boolean(parsed.inStock),
    productType: parsed.productType ?? sp.get("productType") ?? "",
    facets: parseFacetQueryParams(sp),
    sort: parsed.sort ?? "popular",
  };
}

function selectClassName() {
  return "h-10 w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground outline-none focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/25";
}

function flattenSubcategories(root: CategoryTreeNode | undefined) {
  if (!root) return [] as Array<{ slug: string; name: string }>;
  const items: Array<{ slug: string; name: string }> = [];
  for (const child of root.children) {
    items.push({ slug: child.slug, name: child.name });
    for (const leaf of child.children) {
      items.push({ slug: leaf.slug, name: `${child.name} › ${leaf.name}` });
    }
  }
  return items;
}

function FilterFields({
  form,
  setForm,
  categoryTree,
  cities,
  sellers,
  idPrefix,
}: {
  form: FilterFormState;
  setForm: React.Dispatch<React.SetStateAction<FilterFormState>>;
  categoryTree: CategoryTreeNode[];
  cities: string[];
  sellers: ProductSellerOption[];
  idPrefix: string;
}) {
  const set =
    (key: keyof FilterFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const selectedRoot = useMemo(
    () => categoryTree.find((c) => c.slug === form.category),
    [categoryTree, form.category],
  );
  const subcategories = useMemo(
    () => flattenSubcategories(selectedRoot),
    [selectedRoot],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-q`}>Поиск</Label>
        <Input
          id={`${idPrefix}-q`}
          type="search"
          placeholder="Название, описание, категория…"
          value={form.q}
          onChange={set("q")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-category`}>Категория</Label>
        <select
          id={`${idPrefix}-category`}
          className={selectClassName()}
          value={form.category}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              category: e.target.value,
              subcategory: "",
            }))
          }
        >
          <option value="">Все категории</option>
          {categoryTree.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {subcategories.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-subcategory`}>Подкатегория</Label>
          <select
            id={`${idPrefix}-subcategory`}
            className={selectClassName()}
            value={form.subcategory}
            onChange={set("subcategory")}
          >
            <option value="">Все подкатегории</option>
            {subcategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-priceMin`}>Цена от</Label>
          <Input
            id={`${idPrefix}-priceMin`}
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="0"
            value={form.priceMin}
            onChange={set("priceMin")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-priceMax`}>Цена до</Label>
          <Input
            id={`${idPrefix}-priceMax`}
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="∞"
            value={form.priceMax}
            onChange={set("priceMax")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-city`}>Город</Label>
        <Input
          id={`${idPrefix}-city`}
          list={`${idPrefix}-cities`}
          placeholder="Москва"
          value={form.city}
          onChange={set("city")}
        />
        <datalist id={`${idPrefix}-cities`}>
          {cities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-condition`}>Состояние</Label>
        <select
          id={`${idPrefix}-condition`}
          className={selectClassName()}
          value={form.condition}
          onChange={set("condition")}
        >
          <option value="">Любое</option>
          {CONDITION_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {PRODUCT_CONDITION_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-sellerKind`}>Тип продавца</Label>
        <select
          id={`${idPrefix}-sellerKind`}
          className={selectClassName()}
          value={form.sellerKind}
          onChange={set("sellerKind")}
        >
          <option value="">Любой</option>
          {SELLER_KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-seller`}>Продавец</Label>
        <select
          id={`${idPrefix}-seller`}
          className={selectClassName()}
          value={form.seller}
          onChange={set("seller")}
        >
          <option value="">Все продавцы</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.storeName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Наличие</Label>
        <label
          htmlFor={`${idPrefix}-inStock`}
          className="flex cursor-pointer items-center gap-2.5 text-sm"
        >
          <input
            id={`${idPrefix}-inStock`}
            type="checkbox"
            checked={form.inStock}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, inStock: e.target.checked }))
            }
            className="size-4 rounded border-input accent-primary"
          />
          Только в наличии
        </label>
      </div>

      <FacetFilters
        idPrefix={idPrefix}
        categorySlug={form.subcategory || form.category || undefined}
        productType={form.productType || undefined}
        selected={form.facets}
        onChange={(facets) => setForm((prev) => ({ ...prev, facets }))}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-sort`}>Сортировка</Label>
        <select
          id={`${idPrefix}-sort`}
          className={selectClassName()}
          value={form.sort}
          onChange={set("sort")}
        >
          {CATALOG_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function useCatalogFilterForm(
  categoryTree: CategoryTreeNode[],
  lockedCategorySlug?: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(() =>
    stateFromSearchParams(
      new URLSearchParams(searchParams.toString()),
      categoryTree,
    ),
  );

  useEffect(() => {
    const next = stateFromSearchParams(
      new URLSearchParams(searchParams.toString()),
      categoryTree,
    );
    if (lockedCategorySlug && !next.category && !next.subcategory) {
      next.category = lockedCategorySlug;
    }
    setForm(next);
  }, [searchParams, categoryTree, lockedCategorySlug]);

  const syncFromUrl = useCallback(() => {
    const next = stateFromSearchParams(
      new URLSearchParams(searchParams.toString()),
      categoryTree,
    );
    if (lockedCategorySlug && !next.category && !next.subcategory) {
      next.category = lockedCategorySlug;
    }
    setForm(next);
  }, [searchParams, categoryTree, lockedCategorySlug]);

  const apply = useCallback(() => {
    const href = buildListingHref(pathname, {
      q: form.q.trim() || undefined,
      category: form.category || undefined,
      subcategory: form.subcategory || undefined,
      priceMin: form.priceMin.trim() || undefined,
      priceMax: form.priceMax.trim() || undefined,
      city: form.city.trim() || undefined,
      seller: form.seller || undefined,
      sellerKind: form.sellerKind || undefined,
      condition: form.condition || undefined,
      inStock: form.inStock || undefined,
      productType: form.productType.trim() || undefined,
      facets: form.facets,
      sort: form.sort || "popular",
      page: 1,
    });
    startTransition(() => {
      router.push(href);
    });
  }, [form, router, pathname]);

  const clear = useCallback(() => {
    setForm({
      q: "",
      category: lockedCategorySlug ?? "",
      subcategory: "",
      priceMin: "",
      priceMax: "",
      city: "",
      seller: "",
      sellerKind: "",
      condition: "",
      inStock: false,
      productType: "",
      facets: [],
      sort: "popular",
    });
    startTransition(() => {
      router.push(
        lockedCategorySlug
          ? buildListingHref(`${ROUTES.CATEGORY}/${lockedCategorySlug}`, {})
          : ROUTES.CATALOG,
      );
    });
  }, [router, lockedCategorySlug]);

  const facetFromUrl = parseFacetQueryParams(
    new URLSearchParams(searchParams.toString()),
  );
  const parsed = parseCatalogParams({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? lockedCategorySlug ?? undefined,
    subcategory: searchParams.get("subcategory") ?? undefined,
    priceMin: searchParams.get("priceMin") ?? undefined,
    priceMax: searchParams.get("priceMax") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    seller: searchParams.get("seller") ?? undefined,
    sellerKind: searchParams.get("sellerKind") ?? undefined,
    condition: searchParams.get("condition") ?? undefined,
    inStock: searchParams.get("inStock") ?? undefined,
    productType: searchParams.get("productType") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });
  parsed.facets = facetFromUrl;

  const active = hasActiveCatalogFilters(
    lockedCategorySlug
      ? {
          ...parsed,
          category: undefined,
          rootCategory: undefined,
          subcategory: undefined,
        }
      : parsed,
  );

  return {
    form,
    setForm,
    apply,
    clear,
    syncFromUrl,
    pending,
    active,
  };
}

export function CatalogFiltersSidebar({
  categoryTree,
  cities,
  sellers,
  className,
  lockedCategorySlug,
}: CatalogFiltersPanelProps) {
  const { form, setForm, apply, clear, pending, active } = useCatalogFilterForm(
    categoryTree,
    lockedCategorySlug,
  );

  return (
    <aside
      className={cn("hidden w-64 shrink-0 flex-col gap-5 lg:flex", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Фильтры
        </h2>
        {active ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      <FilterFields
        form={form}
        setForm={setForm}
        categoryTree={categoryTree}
        cities={cities}
        sellers={sellers}
        idPrefix="desk"
      />

      <Button type="button" onClick={apply} disabled={pending} className="w-full">
        {pending ? "Применяем…" : "Применить"}
      </Button>
    </aside>
  );
}

export function CatalogFiltersMobile({
  categoryTree,
  cities,
  sellers,
  lockedCategorySlug,
}: CatalogFiltersPanelProps) {
  const { form, setForm, apply, clear, syncFromUrl, pending, active } =
    useCatalogFilterForm(categoryTree, lockedCategorySlug);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) syncFromUrl();
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="catalog-filters-mobile"
            />
          }
        >
          <Filter className="size-4" />
          Фильтры
          {active ? (
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          ) : null}
        </DialogTrigger>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-md"
          data-testid="catalog-filters-drawer"
        >
          <DialogHeader>
            <DialogTitle>Фильтры</DialogTitle>
            <DialogDescription>
              Категория, цена, продавец и наличие.
            </DialogDescription>
          </DialogHeader>
          <FilterFields
            form={form}
            setForm={setForm}
            categoryTree={categoryTree}
            cities={cities}
            sellers={sellers}
            idPrefix="mob"
          />
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clear();
                setOpen(false);
              }}
              disabled={pending}
            >
              Сбросить
            </Button>
            <Button
              type="button"
              onClick={() => {
                apply();
                setOpen(false);
              }}
              disabled={pending}
              data-testid="catalog-filters-apply"
            >
              {pending ? "Применяем…" : "Показать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {active ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={clear}
        >
          <X className="size-3.5" />
          Сбросить
        </Button>
      ) : null}
    </div>
  );
}

export function CatalogSortSelect({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = parseCatalogParams({
    sort: searchParams.get("sort") ?? undefined,
  }).sort;

  return (
    <select
      aria-label="Сортировка"
      data-testid="catalog-sort"
      className={cn(selectClassName(), "w-auto min-w-[11rem]", className)}
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = new URLSearchParams(searchParams.toString());
        const value = e.target.value;
        if (!value || value === "popular") next.delete("sort");
        else next.set("sort", value);
        next.delete("page");
        const qs = next.toString();
        const href = qs ? `${pathname}?${qs}` : pathname;
        startTransition(() => {
          router.push(href);
        });
      }}
    >
      {CATALOG_SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
