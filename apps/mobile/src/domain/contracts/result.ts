/**
 * EPIC 92 — Result type for use cases and repositories (ADR-003, ADR-004).
 */

import type { DomainError } from "./errors";

export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends DomainError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E extends DomainError>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E extends DomainError>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}
