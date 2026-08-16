import { drainPendingQualityEvaluations } from "./events";
import { evaluateProductQuality } from "./queries";
import { isMarketplaceContentQualityEnabled } from "./flags";

/** Safe async batch processor when queue infrastructure is not yet available. */
export async function processPendingQualityEvaluations(limit = 25): Promise<number> {
  if (!isMarketplaceContentQualityEnabled()) return 0;
  const ids = drainPendingQualityEvaluations(limit);
  let processed = 0;
  for (const productId of ids) {
    try {
      await evaluateProductQuality(productId);
      processed += 1;
    } catch {
      // keep marketplace alive — retry on next batch
    }
  }
  return processed;
}
