import type { NextAuthConfig } from "next-auth";

import { isSellerCabinetPath, ROUTES } from "@/lib/constants";

/**
 * Edge-safe Auth.js config (no Prisma / Node-only deps).
 * Used by middleware; full providers live in `auth.ts`.
 */
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14,
  },
  pages: {
    signIn: ROUTES.AUTH_SIGN_IN,
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const buyerProtected =
        pathname === "/account" ||
        pathname.startsWith("/account/") ||
        pathname === "/profile" ||
        pathname.startsWith("/profile/") ||
        pathname === "/favorites" ||
        pathname.startsWith("/favorites/") ||
        pathname === "/history" ||
        pathname.startsWith("/history/") ||
        pathname === "/settings" ||
        pathname.startsWith("/settings/");

      if (buyerProtected) {
        return Boolean(auth?.user?.id);
      }

      if (!pathname.startsWith("/seller")) return true;
      // Public storefront pages are open
      if (!isSellerCabinetPath(pathname)) return true;
      if (!auth?.user?.id) return false;
      const role = auth.user.role;
      if (role !== "SELLER" && role !== "ADMIN") return false;
      if (!auth.user.sellerProfileId) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.sellerProfileId = user.sellerProfileId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = (token.role as typeof session.user.role) ?? "BUYER";
      session.user.sellerProfileId =
        (token.sellerProfileId as string | null | undefined) ?? null;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
