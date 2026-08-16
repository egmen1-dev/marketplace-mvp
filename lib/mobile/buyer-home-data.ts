import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { listFavoriteProducts } from "@/features/favorites/queries";
import { listOrdersForUser } from "@/features/orders";

import { buildMobileBuyerHomePayload, type MobileBuyerHomePayload } from "./buyer-home";

export async function buildMobileBuyerHomeForUser(userId: string): Promise<MobileBuyerHomePayload> {
  const [favorites, orders] = await Promise.all([
    listFavoriteProducts(userId).catch(() => []),
    listOrdersForUser(userId).catch(() => []),
  ]);

  const activeOrders = orders.filter((o) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(o.status)).length;

  return buildMobileBuyerHomePayload({
    discovery: { featuredCount: 0 },
    favourites: { count: favorites.length },
    orders: { active: activeOrders },
    recommendations: { available: true },
  });
}

export async function buildMobileBuyerHomeFromRequest(request: Request): Promise<MobileBuyerHomePayload> {
  const user = await resolveRequestUser(request);
  if (!user) return buildMobileBuyerHomePayload();
  return buildMobileBuyerHomeForUser(user.id);
}
