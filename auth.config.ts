import type { NextAuthConfig } from "next-auth";

import { isSellerCabinetPath, ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";

/**
 * Secure session cookies on HTTPS deployments (Railway, Vercel, Render).
 * Override with AUTH_COOKIE_SECURE=true|false if needed.
 */
function shouldUseSecureCookies(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  if (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL ||
    process.env.RENDER
  ) {
    return true;
  }

  try {
    return getCanonicalAppUrl().startsWith("https://");
  } catch {
    return false;
  }
}

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
  useSecureCookies: shouldUseSecureCookies(),
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
        pathname.startsWith("/settings/") ||
        pathname === "/orders" ||
        pathname.startsWith("/orders/");

      if (buyerProtected) {
        return Boolean(auth?.user?.id);
      }

      if (!pathname.startsWith("/seller")) return true;
      // Public storefront pages are open
      if (!isSellerCabinetPath(pathname)) return true;
      // Cabinet: require login only. Role/ownership verified via DB in pages/actions.
      return Boolean(auth?.user?.id);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.sellerProfileId = user.sellerProfileId;
        token.roleCheckedAt = Date.now();
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
