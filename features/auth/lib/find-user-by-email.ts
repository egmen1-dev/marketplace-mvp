import { prisma } from "@/lib/prisma";

/** Normalize login/registration email — always lowercase trimmed. */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

const emailWhere = (email: string) => {
  const normalized = normalizeAuthEmail(email);
  return {
    OR: [
      { email: normalized },
      { email: { equals: normalized, mode: "insensitive" as const } },
    ],
  };
};

/**
 * Case-insensitive email lookup for credentials auth.
 * Handles legacy rows created before lowercase normalization.
 */
export async function findUserByEmailForAuth(email: string) {
  return prisma.user.findFirst({
    where: emailWhere(email),
    include: { sellerProfile: { select: { id: true } } },
  });
}

/** Lookup for admin grant script — returns id + email. */
export async function findUserRecordByEmail(email: string) {
  return prisma.user.findFirst({
    where: emailWhere(email),
    select: { id: true, email: true, role: true },
  });
}

/** Existence check for sign-up (no includes). */
export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: emailWhere(email),
    select: { id: true },
  });
}
