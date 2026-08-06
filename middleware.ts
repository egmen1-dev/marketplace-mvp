import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { isSellerCabinetPath, ROUTES } from "@/lib/constants";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/account",
  "/profile",
  "/favorites",
  "/history",
  "/settings",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isProtectedPath(pathname)) {
    if (!req.auth?.user?.id) {
      const url = new URL(ROUTES.AUTH_SIGN_IN, req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public storefront `/seller/[id|slug]` — not the cabinet
  if (pathname.startsWith("/seller") && !isSellerCabinetPath(pathname)) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/seller")) {
    return NextResponse.next();
  }

  // Auth required; role + SellerProfile enforced server-side (DB) in cabinet layout.
  // JWT role alone is not authoritative after promotions / demotions.
  if (!req.auth?.user?.id) {
    const url = new URL(ROUTES.AUTH_SIGN_IN, req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/seller",
    "/seller/:path*",
    "/account",
    "/account/:path*",
    "/profile",
    "/profile/:path*",
    "/favorites",
    "/favorites/:path*",
    "/history",
    "/history/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
