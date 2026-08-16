import { getContentQualityProvider } from "./provider-router";
import type { ProductQualityEvaluation, ProductQualityInput } from "./types";
import { isMarketplaceContentQualityEnabled } from "./flags";

export async function evaluateProductQualityInput(
  input: ProductQualityInput,
): Promise<ProductQualityEvaluation> {
  const provider = getContentQualityProvider();
  return provider.evaluateProduct(input);
}

export async function evaluateProductQualityInputSafe(
  input: ProductQualityInput,
): Promise<ProductQualityEvaluation | null> {
  if (!isMarketplaceContentQualityEnabled()) return null;
  try {
    return await evaluateProductQualityInput(input);
  } catch {
    return null;
  }
}
