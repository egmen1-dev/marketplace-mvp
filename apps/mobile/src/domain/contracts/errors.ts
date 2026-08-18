/**
 * EPIC 92 — Unified domain error model (ADR-004).
 * Frozen contract — amend via ADR only.
 */

export type DomainErrorCode =
  | "network"
  | "authentication"
  | "validation"
  | "business"
  | "server"
  | "offline"
  | "timeout"
  | "cancellation"
  | "unknown";

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly field?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type NetworkError = DomainError & { readonly code: "network" };
export type AuthenticationError = DomainError & { readonly code: "authentication" };
export type ValidationError = DomainError & { readonly code: "validation"; readonly field: string };
export type BusinessError = DomainError & { readonly code: "business" };
export type ServerError = DomainError & { readonly code: "server" };
export type OfflineError = DomainError & { readonly code: "offline" };
export type TimeoutError = DomainError & { readonly code: "timeout" };
export type CancellationError = DomainError & { readonly code: "cancellation" };
export type UnknownError = DomainError & { readonly code: "unknown" };

export function isDomainError(value: unknown): value is DomainError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "retryable" in value
  );
}
