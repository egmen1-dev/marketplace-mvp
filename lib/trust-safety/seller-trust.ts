export {
  computeSellerTrustScore,
  type SellerTrustScoreInput,
  type SellerTrustScoreResult,
} from "./trust-score";

export function formatSellerTrustForPdp(input: {
  score: number;
  label: string;
  ordersCompleted: number;
  joinedAt: string;
}): { headline: string; salesLine: string; joinedLine: string } {
  return {
    headline: input.label,
    salesLine:
      input.ordersCompleted > 0
        ? `Продажи: ${input.ordersCompleted}`
        : "Продажи появятся после первых заказов",
    joinedLine: `На платформе с: ${input.joinedAt}`,
  };
}
