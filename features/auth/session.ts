import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  sellerProfileId: string | null;
};

/** Current Auth.js session user from JWT, or null. Prefer `require*Session` for mutations. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
    sellerProfileId: session.user.sellerProfileId,
  };
}

/**
 * Load authoritative role + seller profile from the database.
 * Used for critical seller/admin mutations — do not trust JWT alone.
 */
export async function loadUserAuthFromDb(userId: string): Promise<{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  sellerProfileId: string | null;
  storeName: string | null;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      sellerProfile: { select: { id: true, storeName: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    sellerProfileId: user.sellerProfile?.id ?? null,
    storeName: user.sellerProfile?.storeName ?? null,
  };
}

/** Require any logged-in user (buyer / seller / admin). */
export async function requireUserSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

function isSellerRole(role: UserRole): boolean {
  return role === UserRole.SELLER || role === UserRole.ADMIN;
}

/**
 * Require a logged-in user with role SELLER (or ADMIN) and a SellerProfile.
 * Always re-reads role from the database (JWT may be stale after role change).
 */
export async function requireSellerSession(): Promise<{
  userId: string;
  sellerProfileId: string;
  email: string;
  name: string | null;
  role: UserRole;
  storeName: string;
}> {
  const session = await getSessionUser();
  if (!session) {
    throw new AuthRequiredError();
  }

  const dbUser = await loadUserAuthFromDb(session.id);
  if (!dbUser) {
    throw new AuthRequiredError();
  }

  if (!isSellerRole(dbUser.role)) {
    log.warn("forbidden_seller_mutation", {
      userId: dbUser.id,
      role: dbUser.role,
      reason: "role_not_seller",
    });
    throw new SellerRequiredError();
  }

  if (!dbUser.sellerProfileId) {
    log.warn("forbidden_seller_mutation", {
      userId: dbUser.id,
      role: dbUser.role,
      reason: "missing_seller_profile",
    });
    throw new SellerRequiredError();
  }

  return {
    userId: dbUser.id,
    sellerProfileId: dbUser.sellerProfileId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    storeName: dbUser.storeName ?? "Магазин",
  };
}

/** Require ADMIN role — always verified against the database. */
export async function requireAdminSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    throw new AuthRequiredError();
  }

  const dbUser = await loadUserAuthFromDb(session.id);
  if (!dbUser) {
    throw new AuthRequiredError();
  }

  if (dbUser.role !== UserRole.ADMIN) {
    log.warn("forbidden_admin_mutation", {
      userId: dbUser.id,
      role: dbUser.role,
    });
    throw new AdminRequiredError();
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    role: dbUser.role,
    sellerProfileId: dbUser.sellerProfileId,
  };
}

export class AuthRequiredError extends Error {
  constructor() {
    super("Требуется вход");
    this.name = "AuthRequiredError";
  }
}

export class SellerRequiredError extends Error {
  constructor() {
    super("Нужен профиль продавца");
    this.name = "SellerRequiredError";
  }
}

export class AdminRequiredError extends Error {
  constructor() {
    super("Требуются права администратора");
    this.name = "AdminRequiredError";
  }
}

/**
 * Seller cabinet gate for RSC: DB-checked role + profile, then redirect.
 * Layout should call this; pages may call again for sellerProfileId.
 */
export async function requireSellerCabinetAccess(callbackPath: string) {
  const { redirect } = await import("next/navigation");
  const { ROUTES } = await import("@/lib/constants");
  try {
    return await requireSellerSession();
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      redirect(
        `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(callbackPath)}`,
      );
    }
    if (err instanceof SellerRequiredError) {
      redirect(`${ROUTES.HOME}?error=seller_required`);
    }
    throw err;
  }
}
