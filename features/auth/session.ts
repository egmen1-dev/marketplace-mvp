import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  sellerProfileId: string | null;
};

/** Current Auth.js session user, or null. */
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
 * BUYER accounts must not pass even if a stale profile id exists on the JWT.
 */
export async function requireSellerSession(): Promise<{
  userId: string;
  sellerProfileId: string;
  email: string;
  name: string | null;
  role: UserRole;
  storeName: string;
}> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthRequiredError();
  }

  if (!isSellerRole(user.role)) {
    throw new SellerRequiredError();
  }

  let sellerProfileId = user.sellerProfileId;
  let storeName = "Магазин";

  if (!sellerProfileId) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, storeName: true },
    });
    if (!profile) {
      throw new SellerRequiredError();
    }
    sellerProfileId = profile.id;
    storeName = profile.storeName;
  } else {
    const profile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { storeName: true, userId: true },
    });
    if (!profile || profile.userId !== user.id) {
      throw new SellerRequiredError();
    }
    storeName = profile.storeName;
  }

  return {
    userId: user.id,
    sellerProfileId,
    email: user.email,
    name: user.name,
    role: user.role,
    storeName,
  };
}

/** Require ADMIN role. */
export async function requireAdminSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  if (user.role !== UserRole.ADMIN) {
    throw new AdminRequiredError();
  }
  return user;
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
