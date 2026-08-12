"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { catalogSourceLabel } from "@/lib/catalog-taxonomy/source";
import { normalizeAlias } from "@/lib/catalog-taxonomy/normalize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addProductTypeAliasAction,
  renameProductTypeLotNameAction,
  toggleProductTypeActiveAction,
} from "@/features/taxonomy/actions";

type AdminProductType = {
  id: string;
  name: string;
  lotName: string | null;
  slug: string;
  categoryId: string;
  isActive: boolean;
  externalSource: string | null;
  externalId: string | null;
  aliases: { id: string; alias: string }[];
  characteristics: {
    id: string;
    name: string;
    type: string;
    required: boolean;
    unit: string | null;
    filterable?: boolean;
  }[];
  _count: { products: number };
};

function findDuplicateIds(types: AdminProductType[]): Set<string> {
  const byName = new Map<string, string[]>();
  for (const t of types) {
    if (!t.isActive) continue;
    const key = normalizeAlias(t.lotName ?? t.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(t.id);
    byName.set(key, list);
  }
  const dupes = new Set<string>();
  for (const ids of byName.values()) {
    if (ids.length > 1) ids.forEach((id) => dupes.add(id));
  }
  return dupes;
}

export function AdminTaxonomyTypesPanel({
  productTypes,
}: {
  productTypes: AdminProductType[];
}) {
  const [q, setQ] = useState("");
  const duplicateIds = findDuplicateIds(productTypes);
  const filtered = productTypes.filter((t) => {
    const hay = `${t.name} ${t.lotName ?? ""} ${t.slug}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });
  const dupeCount = duplicateIds.size;

  return (
    <div className="space-y-4">
      {dupeCount > 0 ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Найдено дублей ProductType: <strong>{dupeCount}</strong>. Dry-run:{" "}
          <code className="text-xs">npm run taxonomy:dedupe</code>
        </p>
      ) : null}
      <Input
        placeholder="Поиск ProductType…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Поиск типов товара"
      />
      <div className="divide-y divide-border rounded-xl border border-border">
        {filtered.map((t) => (
          <ProductTypeRow
            key={t.id}
            type={t}
            isDuplicate={duplicateIds.has(t.id)}
          />
        ))}
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Нет типов. Запустите npm run taxonomy:sync
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProductTypeRow({
  type,
  isDuplicate,
}: {
  type: AdminProductType;
  isDuplicate: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const filterableCount = type.characteristics.filter(
    (c) => c.filterable,
  ).length;

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="text-left font-medium hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {type.lotName ?? type.name}
        </button>
        {!type.isActive ? (
          <Badge variant="secondary">скрыт</Badge>
        ) : null}
        {isDuplicate ? (
          <Badge variant="destructive">duplicate</Badge>
        ) : null}
        {type.externalSource ? (
          <Badge variant="outline">{catalogSourceLabel(type.externalSource)}</Badge>
        ) : (
          <Badge variant="outline">{catalogSourceLabel(null)}</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {type._count.products} тов. · {type.characteristics.length} хар. ·{" "}
          {filterableCount} facets · {type.aliases.length} alias
        </span>
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("productTypeId", type.id);
              fd.set("isActive", type.isActive ? "false" : "true");
              start(async () => {
                await toggleProductTypeActiveAction(fd);
                router.refresh();
              });
            }}
          >
            {type.isActive ? "Выкл" : "Вкл"}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            slug: {type.slug}
            {type.externalId ? ` · ext: ${type.externalId}` : ""}
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                await renameProductTypeLotNameAction(fd);
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="productTypeId" value={type.id} />
            <Input
              name="lotName"
              defaultValue={type.lotName ?? type.name}
              className="max-w-xs"
              placeholder="LOT name"
            />
            <Button type="submit" size="sm" disabled={pending}>
              Сохранить имя
            </Button>
          </form>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                await addProductTypeAliasAction(fd);
                e.currentTarget.reset();
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="productTypeId" value={type.id} />
            <Input
              name="alias"
              placeholder="Синоним (болгарка)"
              className="max-w-xs"
              required
            />
            <Button type="submit" size="sm" disabled={pending}>
              + alias
            </Button>
          </form>
          {type.aliases.length ? (
            <p className="text-xs">
              Aliases: {type.aliases.map((a) => a.alias).join(", ")}
            </p>
          ) : null}
          <ul className="space-y-1 text-xs">
            {type.characteristics.map((c) => (
              <li key={c.id}>
                {c.name}
                {c.required ? " *" : ""} · {c.type}
                {c.unit ? ` (${c.unit})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
