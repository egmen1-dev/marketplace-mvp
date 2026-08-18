import { BootStage, type BootFailure } from "./types";

export class BootTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "BootTimeoutError";
  }
}

export class BootApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public status = 400,
  ) {
    super(message);
    this.name = "BootApiError";
  }
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === "TypeError" ||
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("aborted")
  );
}

export function bootFailureCode(stage: BootStage, err: unknown): string {
  if (err instanceof BootTimeoutError) return `${stage.toLowerCase()}_timeout`;
  if (err instanceof BootApiError) {
    if (err.status >= 400) return `${stage.toLowerCase()}_http_${err.status}`;
    return err.code || `${stage.toLowerCase()}_api_error`;
  }
  if (isNetworkError(err)) return `${stage.toLowerCase()}_network`;
  if (err instanceof Error && err.message.includes("invalid payload")) return `${stage.toLowerCase()}_invalid_payload`;
  return `${stage.toLowerCase()}_unexpected`;
}

export function bootFailureMessage(stage: BootStage, err: unknown): string {
  if (err instanceof BootTimeoutError) return "Request timeout";
  if (err instanceof BootApiError) return err.message || `HTTP ${err.status}`;
  if (isNetworkError(err)) return "Network unavailable";
  if (err instanceof Error) {
    if (err.message.includes("SecureStore")) return "SecureStore read failed";
    if (err.message.includes("JWT")) return "JWT decode failed";
    if (err.message.includes("session_expired")) return "Session expired";
    if (err.message.includes("invalid payload")) return "Invalid payload";
    if (err.message.includes("navigation")) return "Navigation failed";
    return err.message;
  }
  return "Unexpected exception";
}

export function parseBootFailure(stage: BootStage, err: unknown, durationMs: number): BootFailure {
  const retryable =
    err instanceof BootTimeoutError ||
    (err instanceof BootApiError && err.retryable) ||
    isNetworkError(err) ||
    stage === BootStage.NAVIGATION;

  return {
    stage,
    code: bootFailureCode(stage, err),
    message: bootFailureMessage(stage, err),
    httpStatus: err instanceof BootApiError ? err.status : undefined,
    durationMs,
    retryable,
    stack: err instanceof Error ? err.stack : undefined,
  };
}

export function bootPipelineHungFailure(durationMs: number): BootFailure {
  return {
    stage: BootStage.BOOTSTRAP,
    code: "boot_pipeline_hung",
    message: "Boot pipeline did not finish in time",
    durationMs,
    retryable: true,
  };
}
