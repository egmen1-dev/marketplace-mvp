import { classifyFetchFailure } from "./classify-fetch-error";

export const BOOT_RETRY_ATTEMPTS = 3;
export const BOOT_RETRY_BASE_DELAY_MS = 1000;

export function isTransientFetchFailure(err: unknown): boolean {
  const classified = classifyFetchFailure(err);
  if (classified.kind === "timeout" || classified.kind === "ssl" || classified.kind === "dns" || classified.kind === "network") {
    return true;
  }
  if (classified.kind === "http" && typeof classified.status === "number" && classified.status >= 500) {
    return true;
  }
  return false;
}

function jitteredDelay(baseMs: number, attempt: number): number {
  const exponential = baseMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 250);
  return exponential + jitter;
}

export async function withBootRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number; onRetry?: (attempt: number, err: unknown) => void },
): Promise<T> {
  const attempts = options?.attempts ?? BOOT_RETRY_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? BOOT_RETRY_BASE_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const canRetry = attempt < attempts && isTransientFetchFailure(err);
      if (!canRetry) break;
      options?.onRetry?.(attempt, err);
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay(baseDelayMs, attempt)));
    }
  }

  throw lastError;
}
