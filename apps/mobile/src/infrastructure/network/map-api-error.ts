import { ApiClientError } from "../../api/client";
import type { DomainError } from "../../domain/contracts/errors";
import {
  authenticationError,
  businessError,
  cancellationError,
  networkError,
  offlineError,
  serverError,
  timeoutError,
  unknownError,
} from "../../domain/errors/error-factory";

export function mapApiErrorToDomain(error: unknown): DomainError {
  if (error instanceof ApiClientError) {
    if (error.code === "TOKEN_EXPIRED" || error.code === "UNAUTHORIZED" || error.code === "REFRESH_REVOKED") {
      return authenticationError(error.message, { apiCode: error.code, status: error.status });
    }
    if (error.code === "OFFLINE" || error.message.toLowerCase().includes("network")) {
      return offlineError(error.message);
    }
    if (error.code === "VALIDATION_ERROR" || error.status === 422) {
      return businessError(error.message, { apiCode: error.code, status: error.status });
    }
    if (error.retryable || error.status >= 500) {
      return serverError(error.message, { apiCode: error.code, status: error.status });
    }
    return businessError(error.message, { apiCode: error.code, status: error.status });
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return cancellationError();
  }

  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
      return timeoutError(error.message);
    }
    if (error.message.toLowerCase().includes("network") || error.message.toLowerCase().includes("fetch")) {
      return networkError(error.message);
    }
    return unknownError(error.message);
  }

  return unknownError("Unknown error");
}

export async function mapThrown<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw mapApiErrorToDomain(error);
  }
}
