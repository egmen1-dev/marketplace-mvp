import { listProducts } from "@/features/products";
import { formatPrice } from "@/features/products/mappers";

import { isDiscoveryPriceGameEnabled } from "./flags";
import { buildWhyReasons } from "./recommendation-context";
import type { PriceGameRound } from "./types";

function shufflePrices(correct: number, currency: string): PriceGameRound["options"] {
  const low = Math.max(100, Math.round(correct * 0.4));
  const high = Math.round(correct * 2.5);
  const mid = Math.round(correct * 1.4);
  const opts = [
    { price: correct, label: formatPrice(correct, currency) },
    { price: mid, label: formatPrice(mid, currency) },
    { price: high, label: formatPrice(high, currency) },
  ];
  if (low !== correct && low !== mid) {
    opts[1] = { price: low, label: formatPrice(low, currency) };
  }
  return opts.sort(() => Math.random() - 0.5);
}

export async function getPriceGameRound(): Promise<PriceGameRound | null> {
  if (!isDiscoveryPriceGameEnabled()) return null;

  const result = await listProducts({
    status: "ACTIVE",
    sort: "popular",
    pageSize: 20,
    inStock: true,
  });

  const product =
    result.items.find((p) => p.compareAt != null && p.compareAt > p.price) ??
    result.items[0];
  if (!product) return null;

  const options = shufflePrices(product.price, product.currency);
  const correctIndex = options.findIndex((o) => o.price === product.price);

  return {
    product,
    options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    reasons: await buildWhyReasons(product),
  };
}
