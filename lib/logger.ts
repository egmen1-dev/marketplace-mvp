/**
 * Minimal structured logging for payment / stock / auth events.
 * Never log secrets, passwords, full webhook payloads, or PII.
 */

export type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

function emit(
  level: "info" | "warn" | "error",
  event: string,
  fields?: LogFields,
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitize(fields),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

function sanitize(fields?: LogFields): LogFields {
  if (!fields) return {};
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("authorization")
    ) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

export const log = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
