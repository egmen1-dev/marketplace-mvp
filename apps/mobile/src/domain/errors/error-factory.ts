/**
 * Sprint 93 — Domain error factories (contracts frozen in contracts/errors.ts).
 */

import type {
  AuthenticationError,
  BusinessError,
  CancellationError,
  DomainError,
  NetworkError,
  OfflineError,
  ServerError,
  TimeoutError,
  UnknownError,
  ValidationError,
} from "../contracts/errors";

export function networkError(message: string, details?: Readonly<Record<string, unknown>>): NetworkError {
  return { code: "network", message, retryable: true, details };
}

export function offlineError(message = "Нет подключения к интернету"): OfflineError {
  return { code: "offline", message, retryable: true };
}

export function timeoutError(message = "Превышено время ожидания"): TimeoutError {
  return { code: "timeout", message, retryable: true };
}

export function authenticationError(message: string, details?: Readonly<Record<string, unknown>>): AuthenticationError {
  return { code: "authentication", message, retryable: false, details };
}

export function validationError(message: string, field: string): ValidationError {
  return { code: "validation", message, retryable: false, field };
}

export function businessError(message: string, details?: Readonly<Record<string, unknown>>): BusinessError {
  return { code: "business", message, retryable: false, details };
}

export function serverError(message: string, details?: Readonly<Record<string, unknown>>): ServerError {
  return { code: "server", message, retryable: true, details };
}

export function cancellationError(message = "Запрос отменён"): CancellationError {
  return { code: "cancellation", message, retryable: false };
}

export function unknownError(message: string, details?: Readonly<Record<string, unknown>>): UnknownError {
  return { code: "unknown", message, retryable: false, details };
}

export function domainErrorMessage(error: DomainError): string {
  return error.message;
}
