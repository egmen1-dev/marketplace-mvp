import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import {
  isSellerCabinetPath,
  resolveLegacySellerCabinetRedirect,
  ROUTES,
} from "@/lib/constants";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/account",
  "/profile",
  "/favorites",
  "/history",
  "/settings",
  "/orders",
  "/admin",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Legacy seller cabinet → unified account (edge redirect avoids RSC #310).
  const legacySellerTarget = resolveLegacySellerCabinetRedirect(pathname);
  if (legacySellerTarget) {
    return NextResponse.redirect(new URL(legacySellerTarget, req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!req.auth?.user?.id) {
      const url = new URL(ROUTES.AUTH_SIGN_IN, req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (req.auth.user.role !== "ADMIN") {
      const url = new URL(ROUTES.HOME, req.nextUrl.origin);
      url.searchParams.set("error", "admin_forbidden");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

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
    "/admin",
    "/admin/:path*",
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
    "/orders",
    "/orders/:path*",
  ],
};
