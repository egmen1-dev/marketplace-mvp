export type MobileSellerHomePayload = {
  money: { available: number; pending: number };
  orders: { needAction: number };
  products: { active: number; needAttention: number };
  promotion: { active: number };
  intelligence: { topAction: string | null; productId: string | null };
  advisoryOnly: true;
};

export function buildMobileSellerHomePayload(input?: Partial<MobileSellerHomePayload>): MobileSellerHomePayload {
  return {
    money: input?.money ?? { available: 0, pending: 0 },
    orders: input?.orders ?? { needAction: 0 },
    products: input?.products ?? { active: 0, needAttention: 0 },
    promotion: input?.promotion ?? { active: 0 },
    intelligence: input?.intelligence ?? { topAction: null, productId: null },
    advisoryOnly: true,
  };
}
