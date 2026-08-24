import type { MobileErrorPayload } from "../types/api";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public status = 400,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function parseApiError(res: Response): Promise<ApiClientError> {
  const body = (await res.json().catch(() => ({}))) as MobileErrorPayload & {
    message?: string;
    code?: string;
    error?: string | { code?: string; message?: string; retryable?: boolean };
  };
  const nested = body.error;
  if (nested && typeof nested === "object" && nested.code) {
    return new ApiClientError(nested.code, nested.message, Boolean(nested.retryable), res.status);
  }
  if (typeof body.code === "string" && body.code.length > 0) {
    const message =
      typeof body.error === "string"
        ? body.error
        : typeof nested === "object" && nested?.message
          ? nested.message
          : body.message ?? res.statusText;
    return new ApiClientError(body.code, message, res.status >= 500, res.status);
  }
  if (typeof body.error === "string" && body.error.length > 0) {
    return new ApiClientError(body.error, body.message ?? body.error, res.status >= 500, res.status);
  }
  return new ApiClientError("HTTP_ERROR", body.message ?? res.statusText, res.status >= 500, res.status);
}
