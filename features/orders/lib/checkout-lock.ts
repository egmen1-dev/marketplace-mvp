import type { Prisma } from "@prisma/client";

/** Serialize checkout order creation per user — prevents duplicate orders on double submit. */
export async function acquireUserCheckoutLock(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkout:${userId}`}))`;
}
