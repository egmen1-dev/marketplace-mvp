import { PrismaClient } from "@prisma/client";

import { withPrismaConnectionRecovery } from "@/lib/prisma-connection-recovery";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

/**
 * Singleton Prisma client. Reuse across hot reloads in dev; in production
 * Next.js still benefits from one instance per process so idle disconnects
 * reconnect on the next query instead of leaking pools.
 *
 * Optional env:
 * - PRISMA_CONNECTION_LIMIT — cap pool size (do not set without measuring Railway limits)
 * - PRISMA_POOL_TIMEOUT — seconds to wait for pool connection (default 60)
 */
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  let datasourceUrl = url;
  if (url) {
    const params = new URLSearchParams();
    if (process.env.PRISMA_CONNECTION_LIMIT && !url.includes("connection_limit=")) {
      params.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT);
    }
    if (!url.includes("pool_timeout=")) {
      params.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT ?? "60");
    }
    if (!url.includes("connect_timeout=")) {
      params.set("connect_timeout", process.env.PRISMA_CONNECT_TIMEOUT ?? "30");
    }
    if ([...params.keys()].length > 0) {
      const separator = url.includes("?") ? "&" : "?";
      datasourceUrl = `${url}${separator}${params.toString()}`;
    }
  }

  const base = new PrismaClient({
    datasources: datasourceUrl && datasourceUrl !== url ? { db: { url: datasourceUrl } } : undefined,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return withPrismaConnectionRecovery(base);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
