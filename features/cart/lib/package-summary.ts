import type { CartView } from "@/features/cart/types";

const DEFAULT_WEIGHT_KG = 0.5;
const DEFAULT_DIM_CM = { length: 20, width: 15, height: 10 };

/** Aggregate cart lines into a single package estimate for CDEK quotes. */
export function computeCartPackageSummary(cart: CartView): {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
} {
  let weightGrams = 0;
  let lengthCm = 0;
  let widthCm = 0;
  let heightCm = 0;

  for (const line of cart.items) {
    const kg = line.product.weight ?? DEFAULT_WEIGHT_KG;
    weightGrams += Math.round(kg * 1000) * line.quantity;
    lengthCm = Math.max(lengthCm, line.product.lengthCm ?? 0);
    widthCm = Math.max(widthCm, line.product.widthCm ?? 0);
    heightCm = Math.max(heightCm, line.product.heightCm ?? 0);
  }

  return {
    weightGrams: Math.max(500, weightGrams),
    lengthCm: lengthCm > 0 ? lengthCm : DEFAULT_DIM_CM.length,
    widthCm: widthCm > 0 ? widthCm : DEFAULT_DIM_CM.width,
    heightCm: heightCm > 0 ? heightCm : DEFAULT_DIM_CM.height,
  };
}
