import type { UserRole } from "@prisma/client";

import { verifyAccessToken } from "@/lib/mobile/auth/tokens";

import {
  AuthRequiredError,
  getSessionUser,
  loadUserAuthFromDb,
  SellerRequiredError,
  type SessionUser,
} from "./session";

export { AuthRequiredError, SellerRequiredError };

/** Resolve authenticated user from mobile Bearer JWT or web Auth.js session. */
export async function resolveRequestUser(request?: Request): Promise<SessionUser | null> {
  if (request) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (bearer) {
      const claims = await verifyAccessToken(bearer).catch(() => null);
      if (claims?.sub) {
        const dbUser = await loadUserAuthFromDb(claims.sub);
        if (dbUser) {
          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            image: dbUser.image,
            role: dbUser.role,
            sellerProfileId: dbUser.sellerProfileId,
          };
        }
      }
    }
  }

  return getSessionUser();
}

export function isSellerCapable(role: UserRole): boolean {
  return role === "SELLER" || role === "ADMIN";
}

/** Seller mutation auth for mobile Bearer JWT or web session (same checks as requireSellerSession). */
export async function requireSellerFromRequest(request: Request): Promise<{
  userId: string;
  sellerProfileId: string;
  email: string;
  name: string | null;
  role: UserRole;
  storeName: string;
}> {
  const user = await resolveRequestUser(request);
  if (!user) throw new AuthRequiredError();
  const dbUser = await loadUserAuthFromDb(user.id);
  if (!dbUser) throw new AuthRequiredError();
  if (!isSellerCapable(dbUser.role)) throw new SellerRequiredError();
  if (!dbUser.sellerProfileId) throw new SellerRequiredError();
  return {
    userId: dbUser.id,
    sellerProfileId: dbUser.sellerProfileId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    storeName: dbUser.storeName ?? "Магазин",
  };
}
