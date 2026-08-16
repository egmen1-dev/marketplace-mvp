import type { UserRole } from "@prisma/client";

import { verifyAccessToken } from "@/lib/mobile/auth/tokens";

import { getSessionUser, loadUserAuthFromDb, type SessionUser } from "./session";

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
