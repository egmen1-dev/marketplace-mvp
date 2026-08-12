import { log, type LogFields } from "@/lib/logger";

export type CaptureContext = LogFields & {
  entityId?: string;
  entityType?: string;
  route?: string;
};

/**
 * Central error capture — structured JSON log (Railway/Vercel log drain).
 * Wire Sentry on production GO: see docs/OBSERVABILITY_AUDIT.md §Sentry.
 * Never pass secrets, tokens, passwords, or raw PII in context.
 */
export function captureError(
  event: string,
  error: unknown,
  context?: CaptureContext,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  log.error(event, {
    ...context,
    errorType: err.name,
    message: err.message.slice(0, 500),
    result: "error",
  });
}
