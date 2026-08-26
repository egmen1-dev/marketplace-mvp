export const dynamic = "force-dynamic";

import Link from "next/link";

import { ShadowBlindReviewPanel } from "@/features/marketplace-trust-loop/components/shadow-blind-review-panel";
import { getBlindShadowProductDetail, getOrCreateOpenShadowBatch } from "@/lib/moderation/staging-shadow/blind-review";

type Props = { params: Promise<{ id: string }> };

export default async function AdminShadowReviewProductPage({ params }: Props) {
  const { id } = await params;
  const batch = await getOrCreateOpenShadowBatch();
  const product = await getBlindShadowProductDetail(id);
  if (!product) {
    return <p>Product not found</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/shadow-review" className="text-sm underline">
        ← Shadow queue
      </Link>
      <ShadowBlindReviewPanel product={product} batchId={batch.id} />
    </div>
  );
}
