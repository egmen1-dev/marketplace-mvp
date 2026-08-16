import type { SellerLifecycleStage } from "./types";

export function resolveSellerLifecycle(completedOrders: number): SellerLifecycleStage {
  if (completedOrders <= 0) return "new";
  if (completedOrders < 30) return "growing";
  if (completedOrders >= 100) return "established";
  return "growing";
}

export function buildSellerContext(input: {
  completedOrders: number;
  trustScore?: number | null;
}) {
  const lifecycle = resolveSellerLifecycle(input.completedOrders);
  let trustTier: string | undefined;
  if (input.trustScore != null) {
    if (input.trustScore >= 80) trustTier = "high";
    else if (input.trustScore >= 60) trustTier = "medium";
    else trustTier = "low";
  }
  return { lifecycle, trustTier, completedOrders: input.completedOrders };
}

export function sellerLifecycleConfidence(completedOrders: number): number {
  if (completedOrders >= 100) return 0.9;
  if (completedOrders >= 10) return 0.7;
  if (completedOrders >= 1) return 0.45;
  return 0.25;
}
