import { Prisma, PrismaClient } from "@prisma/client";

import { log } from "@/lib/logger";

const TRANSIENT_CONNECTION_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

export function isTransientPrismaConnectionError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    TRANSIENT_CONNECTION_CODES.has(err.code)
  );
}

export function withPrismaConnectionRecovery(client: PrismaClient): PrismaClient {
  return client.$extends({
    query: {
      $allOperations({ args, query }) {
        return runWithConnectionRecovery(client, () => query(args));
      },
    },
  }) as unknown as PrismaClient;
}

async function runWithConnectionRecovery<T>(
  client: PrismaClient,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (!isTransientPrismaConnectionError(err)) {
      throw err;
    }
    const code =
      err instanceof Prisma.PrismaClientKnownRequestError ? err.code : "unknown";
    log.warn("prisma_connection_recover", { prismaCode: code });
    try {
      await client.$disconnect();
    } catch {
      // ignore disconnect errors during recovery
    }
    await client.$connect();
    return operation();
  }
}
