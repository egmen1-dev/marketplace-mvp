"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  createMyCollectionAction,
  trackCollectionSharedAction,
} from "@/lib/marketplace-social-growth/actions";
import type { UserCollectionSummary } from "@/lib/marketplace-social-growth/types";

type UserCollectionsPanelProps = {
  collections: UserCollectionSummary[];
};

export function UserCollectionsPanel({ collections: initial }: UserCollectionsPanelProps) {
  const [collections, setCollections] = useState(initial);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function createCollection() {
    if (!title.trim()) return;
    startTransition(async () => {
      const created = await createMyCollectionAction({ title: title.trim() });
      if (created) {
        setCollections((prev) => [created, ...prev]);
        setTitle("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="user-collections-panel">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Создать подборку</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Например: Подарки семье"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="button" disabled={pending} onClick={createCollection}>
            Создать
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {collections.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="font-medium">{c.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {c.productCount} товаров
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `${window.location.origin}${c.sharePath}`,
                );
                trackCollectionSharedAction(c.id);
              }}
            >
              Поделиться ссылкой
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
