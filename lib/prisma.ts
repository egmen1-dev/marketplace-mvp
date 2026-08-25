import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client. Reuse across hot reloads in dev; in production
 * Next.js still benefits from one instance per process so idle disconnects
 * reconnect on the next query instead of leaking pools.
 */
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  const pooledUrl =
    url && !url.includes("connection_limit=")
      ? `${url}${url.includes("?") ? "&" : "?"}connection_limit=5&pool_timeout=30`
      : url;

  return new PrismaClient({
    datasources: pooledUrl ? { db: { url: pooledUrl } } : undefined,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
