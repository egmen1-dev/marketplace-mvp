import type { ProductQualityEvaluation, ProductQualityInput } from "../types";

export interface ContentQualityProvider {
  readonly name: string;
  readonly version: string;
  evaluateProduct(input: ProductQualityInput): Promise<ProductQualityEvaluation>;
}
