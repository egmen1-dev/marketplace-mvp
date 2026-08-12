"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createCategoryAction,
  hideCategoryAction,
  showCategoryAction,
  updateCategoryAction,
} from "@/features/admin/actions";
import type { AdminCategoryRow } from "@/features/admin/queries";
import { catalogSourceLabel } from "@/lib/catalog-taxonomy/source";

export function AdminCategoriesPanel({
  categories,
}: {
  categories: AdminCategoryRow[];
}) {
  const byParent = new Map<string | null, AdminCategoryRow[]>();
  for (const cat of categories) {
    const key = cat.parentId;
    const list = byParent.get(key) ?? [];
    list.push(cat);
    byParent.set(key, list);
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const nodes = byParent.get(parentId) ?? [];
    return nodes.map((cat) => (
      <div key={cat.id} className="border-b border-border last:border-b-0">
        <CategoryRow cat={cat} depth={depth} all={categories} />
        {renderTree(cat.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="flex flex-col gap-8">
      <CreateCategoryForm categories={categories} />
      <div>
        <h3 className="mb-3 font-heading text-base font-semibold">Дерево</h3>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Категорий пока нет.</p>
        ) : (
          <div className="rounded-xl border border-border">{renderTree(null, 0)}</div>
        )}
      </div>
    </div>
  );
}

function CreateCategoryForm({
  categories,
}: {
  categories: AdminCategoryRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await createCategoryAction(formData);
          if (!result.ok) {
            setError(result.error ?? "Ошибка");
            return;
          }
          e.currentTarget.reset();
          router.refresh();
        });
      }}
    >
      <h3 className="font-heading text-base font-semibold sm:col-span-2">
        Создать категорию
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Название</Label>
        <Input id="cat-name" name="name" required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-slug">Slug (опционально)</Label>
        <Input id="cat-slug" name="slug" placeholder="auto" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cat-desc">Описание</Label>
        <Textarea id="cat-desc" name="description" rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-parent">Родитель</Label>
        <select
          id="cat-parent"
          name="parentId"
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">— корень —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {"—".repeat(c.level - 1)} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-sort">Порядок</Label>
        <Input id="cat-sort" name="sortOrder" type="number" defaultValue={0} />
      </div>
      {error ? (
        <p className="text-sm text-destructive sm:col-span-2">{error}</p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Создаём…" : "Создать"}
        </Button>
      </div>
    </form>
  );
}

function CategoryRow({
  cat,
  depth,
  all,
}: {
  cat: AdminCategoryRow;
  depth: number;
  all: AdminCategoryRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{cat.name}</span>
          <span className="text-xs text-muted-foreground">{cat.slug}</span>
          {!cat.isActive ? (
            <Badge variant="outline">Скрыта</Badge>
          ) : (
            <Badge variant="secondary">L{cat.level}</Badge>
          )}
          <Badge variant="outline">{catalogSourceLabel(cat.externalSource)}</Badge>
          {cat.path ? (
            <span className="text-xs text-muted-foreground">{cat.path}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {cat.productCount} тов. · {cat.childrenCount} доч.
          </span>
        </div>
        {editing ? (
          <form
            className="mt-3 grid max-w-xl gap-2 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              formData.set("categoryId", cat.id);
              setError(null);
              startTransition(async () => {
                const result = await updateCategoryAction(cat.id, formData);
                if (!result.ok) {
                  setError(result.error ?? "Ошибка");
                  return;
                }
                setEditing(false);
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="categoryId" value={cat.id} />
            <Input name="name" defaultValue={cat.name} required />
            <Input name="slug" defaultValue={cat.slug} />
            <Textarea
              name="description"
              defaultValue={cat.description ?? ""}
              rows={2}
              className="sm:col-span-2"
            />
            <select
              name="parentId"
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              defaultValue={cat.parentId ?? ""}
            >
              <option value="">— корень —</option>
              {all
                .filter((c) => c.id !== cat.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <Input
              name="sortOrder"
              type="number"
              defaultValue={cat.sortOrder}
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Видимость</Label>
              <select
                name="isActive"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                defaultValue={cat.isActive ? "true" : "false"}
              >
                <option value="true">Активна</option>
                <option value="false">Скрыта</option>
              </select>
            </div>
            {error ? (
              <p className="text-sm text-destructive sm:col-span-2">{error}</p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}>
                Сохранить
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        ) : null}
      </div>
      {!editing ? (
        <div className="flex shrink-0 flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Редактировать
          </Button>
          {cat.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await hideCategoryAction(cat.id);
                  router.refresh();
                });
              }}
            >
              Скрыть
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await showCategoryAction(cat.id);
                  router.refresh();
                });
              }}
            >
              Показать
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
