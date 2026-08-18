export type RetryPolicy = {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 400,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= policy.maxAttempts || !shouldRetry(error, attempt)) break;
      await new Promise((r) => setTimeout(r, policy.baseDelayMs * attempt));
    }
  }
  throw lastError;
}
