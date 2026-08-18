import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

import { verifyCheckoutHandoffToken, hashHandoffForLog } from "@/lib/mobile/checkout-handoff";
import { getCanonicalAppUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

function sessionCookieName(secure: boolean): string {
  return secure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

function useSecureCookies(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  try {
    return getCanonicalAppUrl().startsWith("https://");
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

/**
 * Exchange mobile checkout handoff token for web session cookie, redirect to checkout.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const returnDeepLink = searchParams.get("return") ?? "lot://orders";

  if (!token) {
    return NextResponse.redirect(new URL(ROUTES.AUTH_SIGN_IN, getCanonicalAppUrl()));
  }

  const userId = await verifyCheckoutHandoffToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Handoff token invalid or expired" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      isBlocked: true,
      sellerProfile: { select: { id: true } },
    },
  });

  if (!user || user.isBlocked) {
    return NextResponse.json({ error: "User unavailable" }, { status: 403 });
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET missing" }, { status: 500 });
  }

  const sessionToken = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      role: user.role as UserRole,
      sellerProfileId: user.sellerProfile?.id ?? null,
      roleCheckedAt: Date.now(),
    },
    secret,
    maxAge: 60 * 60 * 24 * 14,
  });

  const secure = useSecureCookies();
  const checkoutUrl = new URL(ROUTES.CHECKOUT, getCanonicalAppUrl());
  checkoutUrl.searchParams.set("mobileReturn", returnDeepLink);
  checkoutUrl.searchParams.set("handoff", hashHandoffForLog(token));

  const response = NextResponse.redirect(checkoutUrl);
  response.cookies.set(sessionCookieName(secure), sessionToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
