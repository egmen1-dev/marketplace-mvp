"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, LayoutGrid, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CategoryTreeNode } from "@/features/catalog/queries";
import { categoryPagePath } from "@/features/catalog/paths";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CatalogMenuProps = {
  tree: CategoryTreeNode[];
};

function CategoryColumn({
  node,
  onNavigate,
}: {
  node: CategoryTreeNode;
  onNavigate?: () => void;
}) {
  return (
    <div className="min-w-0">
      <Link
        href={categoryPagePath(node.slug)}
        onClick={onNavigate}
        className="font-heading text-sm font-semibold text-foreground transition-colors hover:text-primary"
      >
        {node.name}
      </Link>
      {node.children.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {node.children.map((child) => (
            <li key={child.id}>
              <Link
                href={categoryPagePath(child.slug)}
                onClick={onNavigate}
                className="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <span className="truncate">{child.name}</span>
                {child.children.length > 0 ? (
                  <ChevronRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                ) : null}
              </Link>
              {child.children.length > 0 ? (
                <ul className="mt-1 space-y-1 border-l border-border/70 pl-2.5">
                  {child.children.slice(0, 6).map((leaf) => (
                    <li key={leaf.id}>
                      <Link
                        href={categoryPagePath(leaf.slug)}
                        onClick={onNavigate}
                        className="block truncate text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        {leaf.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CatalogMenuDesktop({ tree }: CatalogMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <Button
        size="sm"
        className="shrink-0 rounded-xl"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid data-icon="inline-start" />
        Каталог
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Каталог категорий"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(90vw,52rem)] animate-fade-up rounded-2xl border border-border bg-card p-5 shadow-card-hover"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-heading text-sm font-semibold">Категории</p>
            <Link
              href={ROUTES.CATEGORIES}
              onClick={() => setOpen(false)}
              className="text-xs text-primary transition-colors hover:underline"
            >
              Все категории
            </Link>
          </div>
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Категории скоро появятся.
            </p>
          ) : (
            <div className="grid max-h-[min(70vh,28rem)] grid-cols-2 gap-6 overflow-y-auto lg:grid-cols-3">
              {tree.map((node) => (
                <CategoryColumn
                  key={node.id}
                  node={node}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-border pt-4">
            <Button
              className="w-full rounded-xl"
              nativeButton={false}
              render={
                <Link href={ROUTES.CATALOG} onClick={() => setOpen(false)} />
              }
            >
              Весь каталог
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CatalogMenuMobile({ tree }: CatalogMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 rounded-xl md:hidden"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <LayoutGrid data-icon="inline-start" />
        Каталог
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Каталог"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-background shadow-card-hover",
              "animate-fade-up",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-heading text-base font-semibold">Каталог</p>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <Link
                href={ROUTES.CATEGORIES}
                onClick={() => setOpen(false)}
                className="mb-4 block text-sm text-primary"
              >
                Все категории
              </Link>
              <div className="space-y-6">
                {tree.map((node) => (
                  <CategoryColumn
                    key={node.id}
                    node={node}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </div>
            <div className="border-t border-border p-4">
              <Button
                className="w-full rounded-xl"
                nativeButton={false}
                render={<Link href={ROUTES.CATALOG} onClick={() => setOpen(false)} />}
              >
                Весь каталог
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CatalogMenu({ tree }: CatalogMenuProps) {
  return (
    <>
      <CatalogMenuDesktop tree={tree} />
      <CatalogMenuMobile tree={tree} />
    </>
  );
}
