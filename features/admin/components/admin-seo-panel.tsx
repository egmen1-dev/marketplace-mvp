"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  approveSeoPageAction,
  disableSeoPageIndexingAction,
  generateSeoDraftAction,
} from "@/features/admin/actions";
import { toastError } from "@/lib/toasts";

type SeoRow = {
  id: string;
  entityType: string;
  path: string;
  title: string | null;
  status: string;
  indexable: boolean;
  score: number;
  updatedAt: string;
};

export function AdminSeoPanel({ pages }: { pages: SeoRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4" data-testid="admin-seo-panel">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          data-testid="seo-generate-drafts"
          onClick={() => {
            start(async () => {
              const res = await generateSeoDraftAction();
              if (!res.ok) toastError(res.error);
              else {
                toast.success(res.message ?? "Drafts created");
                router.refresh();
              }
            });
          }}
        >
          Generate AI drafts (brands)
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Index</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-sm text-muted-foreground"
                >
                  Нет SEO pages. Сгенерируйте drafts или создайте facet landing
                  вручную после GO.
                </td>
              </tr>
            ) : (
              pages.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="max-w-[240px] truncate px-3 py-2 font-mono text-xs">
                    {p.path}
                  </td>
                  <td className="px-3 py-2">{p.entityType}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{p.score}</td>
                  <td className="px-3 py-2">{p.indexable ? "yes" : "no"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.status !== "APPROVED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => {
                            start(async () => {
                              const res = await approveSeoPageAction(p.id);
                              if (!res.ok) toastError(res.error);
                              else router.refresh();
                            });
                          }}
                        >
                          Approve
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const res = await disableSeoPageIndexingAction(p.id);
                            if (!res.ok) toastError(res.error);
                            else router.refresh();
                          });
                        }}
                      >
                        Disable index
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
