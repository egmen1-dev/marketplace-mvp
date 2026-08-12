"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  applyTaxonomyImportBatchAction,
  runTaxonomyImportDryRunAction,
  setTaxonomyImportItemStatusAction,
} from "@/features/admin/actions";
import { toastError } from "@/lib/toasts";

type Item = {
  id: string;
  entityType: string;
  action: string;
  status: string;
  confidence: number;
  reason: string | null;
  externalId: string | null;
};

type Batch = {
  id: string;
  source: string;
  version: string;
  status: string;
  statistics: Record<string, number> | null;
  itemCount: number;
  createdAt: string;
};

export function TaxonomyImportPanel({
  batches,
  selected,
  items,
}: {
  batches: Batch[];
  selected: Batch | null;
  items: Item[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-6" data-testid="taxonomy-import-panel">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          data-testid="taxonomy-import-dry-run"
          onClick={() => {
            start(async () => {
              const res = await runTaxonomyImportDryRunAction();
              if (!res.ok) toastError(res.error ?? "Ошибка");
              else {
                toast.success(res.message ?? "Dry-run OK");
                router.refresh();
              }
            });
          }}
        >
          Dry-run (snapshot)
        </Button>
        {selected && selected.status !== "APPLIED" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            data-testid="taxonomy-import-apply"
            onClick={() => {
              start(async () => {
                const res = await applyTaxonomyImportBatchAction(selected.id);
                if (!res.ok) toastError(res.error ?? "Ошибка");
                else {
                  toast.success(res.message ?? "Applied");
                  router.refresh();
                }
              });
            }}
          >
            Apply approved
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2">Batch</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Stats</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr
                key={b.id}
                className="border-b border-border/60 hover:bg-muted/40"
              >
                <td className="px-3 py-2">
                  <a
                    className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                    href={`/admin/taxonomy/import?batch=${b.id}`}
                  >
                    {b.id.slice(0, 10)}…
                  </a>
                </td>
                <td className="px-3 py-2">{b.source}</td>
                <td className="px-3 py-2">{b.status}</td>
                <td className="px-3 py-2">{b.itemCount}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {b.statistics
                    ? `+${b.statistics.created ?? 0} ~${b.statistics.updated ?? 0} ?${b.statistics.needReview ?? 0}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(b.createdAt).toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-semibold">
            Items · {selected.id.slice(0, 10)}… · {selected.status}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Conf</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.entityType}
                    </td>
                    <td className="px-3 py-2">{item.action}</td>
                    <td className="px-3 py-2">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-xs">
                      {item.reason ?? "—"}
                    </td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">
                      {item.status === "PENDING" || item.status === "REJECTED" ? (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={pending}
                            onClick={() => {
                              start(async () => {
                                await setTaxonomyImportItemStatusAction(
                                  item.id,
                                  "APPROVED",
                                );
                                router.refresh();
                              });
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => {
                              start(async () => {
                                await setTaxonomyImportItemStatusAction(
                                  item.id,
                                  "REJECTED",
                                );
                                router.refresh();
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Выберите batch или запустите dry-run (snapshot only).
        </p>
      )}
    </div>
  );
}
