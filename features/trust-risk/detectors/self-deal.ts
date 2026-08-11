/**
 * SelfDealDetector (AGENT-019, section 21). Detects a seller transacting with
 * their own listing (buyer account == seller's owner). Reuses the existing
 * own-product concept; raises a RiskEvent rather than silently blocking.
 */

export type SelfDealResult = {
  isSelfDeal: boolean;
  confidence: number;
  reason: string;
};

export function detectSelfDeal(input: {
  buyerUserId: string;
  sellerOwnerUserId: string;
}): SelfDealResult {
  if (input.buyerUserId && input.buyerUserId === input.sellerOwnerUserId) {
    return {
      isSelfDeal: true,
      confidence: 100,
      reason: "Покупатель и владелец товара — один аккаунт",
    };
  }
  return { isSelfDeal: false, confidence: 100, reason: "Признаков self-deal нет" };
}
