export const dynamic = "force-dynamic";

import Link from "next/link";

import { ShadowBlindReviewPanel } from "@/features/marketplace-trust-loop/components/shadow-blind-review-panel";
import { getBlindShadowProductDetail, getOrCreateOpenShadowBatch, getShadowReviewQueue } from "@/lib/moderation/staging-shadow/blind-review";
import { sampleStagingProductsFromDb } from "@/lib/moderation/staging-shadow/evaluate-product";

export const metadata = { title: "Shadow Review" };

export default async function AdminShadowReviewPage() {
  const batch = await getOrCreateOpenShadowBatch();
  const productIds = await sampleStagingProductsFromDb(75);
  const pending = await getShadowReviewQueue({ batchId: batch.id, productIds, reviewerId: "admin-shadow" });
  const nextId = pending[0] ?? null;
  const product = nextId ? await getBlindShadowProductDetail(nextId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Policy V2 Shadow Review</h2>
        <p className="text-sm text-muted-foreground">
          Blind human baseline for automation acceptance. Does not mutate publication status.
        </p>
        <p className="mt-1 text-sm">
          Batch <code>{batch.sampleBatchId}</code> — {pending.length} pending / {productIds.length} sample
        </p>
      </div>

      {product ? (
        <ShadowBlindReviewPanel product={product} batchId={batch.id} />
      ) : (
        <p className="text-muted-foreground">No pending shadow reviews in this batch.</p>
      )}

      <div className="text-sm">
        <Link href="/admin/moderation" className="underline">
          Regular moderation queue
        </Link>
      </div>
    </div>
  );
}
