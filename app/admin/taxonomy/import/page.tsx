import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdminImportBatch,
  listAdminImportBatches,
} from "@/features/admin/queries";
import { TaxonomyImportPanel } from "@/features/admin/components/taxonomy-import-panel";

export const metadata = {
  title: "Taxonomy Import",
};

export default async function AdminTaxonomyImportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const sp = await searchParams;
  const batches = await listAdminImportBatches(40);
  const selectedId = sp.batch ?? batches[0]?.id ?? null;
  const detail = selectedId ? await getAdminImportBatch(selectedId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Taxonomy Import Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Dry-run → review → approve → apply. Default source is snapshot. Mass
          WB import requires separate GO. Catalog Core sync is not replaced.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>
            PENDING batches are reviewable. Apply writes via{" "}
            <code className="text-xs">syncTaxonomyToDb</code> + unify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxonomyImportPanel
            batches={batches}
            selected={
              detail
                ? {
                    id: detail.id,
                    source: detail.source,
                    version: detail.version,
                    status: detail.status,
                    statistics:
                      (detail.statistics as Record<string, number> | null) ??
                      null,
                    itemCount: detail.items.length,
                    createdAt: detail.createdAt.toISOString(),
                  }
                : null
            }
            items={
              detail?.items.map((i) => ({
                id: i.id,
                entityType: i.entityType,
                action: i.action,
                status: i.status,
                confidence: i.confidence,
                reason: i.reason,
                externalId: i.externalId,
              })) ?? []
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
