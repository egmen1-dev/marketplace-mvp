export type MobileBuyerHomePayload = {
  discovery: { featuredCount: number };
  favourites: { count: number };
  orders: { active: number };
  recommendations: { available: boolean };
  advisoryOnly: true;
};

export function buildMobileBuyerHomePayload(input?: Partial<MobileBuyerHomePayload>): MobileBuyerHomePayload {
  return {
    discovery: input?.discovery ?? { featuredCount: 0 },
    favourites: input?.favourites ?? { count: 0 },
    orders: input?.orders ?? { active: 0 },
    recommendations: input?.recommendations ?? { available: false },
    advisoryOnly: true,
  };
}
