import { log } from "@/lib/logger";
import { mapPrismaError } from "@/lib/api/prisma-errors";

export type RouteTimingMeta = {
  route: string;
  method: string;
  requestId?: string;
};

export async function withRouteTiming<T>(
  meta: RouteTimingMeta,
  handler: () => Promise<T>,
): Promise<T> {
  const started = performance.now();
  try {
    const result = await handler();
    const durationMs = Math.round(performance.now() - started);
    if (durationMs >= 500 || process.env.STAGING_ROUTE_TIMING === "1") {
      log.info("route_timing", {
        route: meta.route,
        method: meta.method,
        requestId: meta.requestId,
        durationMs,
        outcome: "ok",
      });
    }
    return result;
  } catch (err) {
    const durationMs = Math.round(performance.now() - started);
    const prismaError = mapPrismaError(err);
    log.error("route_timing", {
      route: meta.route,
      method: meta.method,
      requestId: meta.requestId,
      durationMs,
      outcome: "error",
      errorName: err instanceof Error ? err.name : "unknown",
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : "unknown",
      prismaCode: prismaError?.prismaCode,
      errorCode: prismaError?.code,
    });
    throw err;
  }
}

export function requestIdFromHeaders(request: Request): string | undefined {
  return (
    request.headers.get("x-acceptance-run-id") ??
    request.headers.get("x-request-id") ??
    undefined
  );
}
