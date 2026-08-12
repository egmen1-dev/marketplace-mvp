import { log } from "@/lib/logger";

/**
 * Node runtime hooks for unhandled errors.
 * Sentry: set SENTRY_DSN + run `npx @sentry/wizard@latest -i nextjs` before production GO.
 */
export function registerMonitoring(): void {
  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unknown";
    log.error("unhandled_rejection", {
      message: message.slice(0, 500),
      errorType: reason instanceof Error ? reason.name : "Rejection",
    });
  });

  process.on("uncaughtException", (err) => {
    log.error("uncaught_exception", {
      message: err.message.slice(0, 500),
      errorType: err.name,
    });
  });
}
