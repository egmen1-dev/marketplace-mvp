import { NextResponse } from "next/server";

import { requireAdminSession } from "@/features/auth";
import { getBlindShadowProductDetail, getOrCreateOpenShadowBatch, getShadowReviewQueue } from "@/lib/moderation/staging-shadow/blind-review";
import { sampleStagingProductsFromDb } from "@/lib/moderation/staging-shadow/evaluate-product";

export async function GET(request: Request) {
  await requireAdminSession();
  const url = new URL(request.url);
  const batchKey = url.searchParams.get("batch") ?? undefined;
  const reviewerId = url.searchParams.get("reviewerId") ?? "admin-shadow";

  const batch = await getOrCreateOpenShadowBatch(batchKey);
  const productIds = await sampleStagingProductsFromDb(Number(process.env.SHADOW_SAMPLE_SIZE ?? "75"));
  const pending = await getShadowReviewQueue({ batchId: batch.id, productIds, reviewerId });

  return NextResponse.json({
    batch: { id: batch.id, sampleBatchId: batch.sampleBatchId, status: batch.status },
    totalSample: productIds.length,
    pendingCount: pending.length,
    pendingProductIds: pending.slice(0, 20),
  });
}
