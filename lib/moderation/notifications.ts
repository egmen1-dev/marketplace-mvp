import type { ModerationDecision } from "./types";

export async function notifyModerationDecision(input: {
  productId: string;
  sellerId: string;
  decision: ModerationDecision;
}): Promise<void> {
  const event =
    input.decision === "APPROVE"
      ? "LOT_APPROVED"
      : input.decision === "NEEDS_CHANGES"
        ? "LOT_NEEDS_CHANGES"
        : input.decision === "REJECT"
          ? "LOT_REJECTED"
          : "LOT_SUBMITTED";

  if (process.env.NODE_ENV !== "test") {
    console.info("[moderation:notify]", {
      event,
      productId: input.productId,
      sellerId: input.sellerId,
    });
  }
}
