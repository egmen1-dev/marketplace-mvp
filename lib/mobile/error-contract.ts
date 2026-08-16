export type MobileErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "TOKEN_EXPIRED"
  | "REFRESH_INVALID"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "COMPATIBILITY_ERROR"
  | "INTERNAL_ERROR";

export type MobileErrorPayload = {
  error: {
    code: MobileErrorCode;
    message: string;
    retryable: boolean;
  };
};

export function buildMobileError(
  code: MobileErrorCode,
  message: string,
  retryable = false,
): MobileErrorPayload {
  return { error: { code, message, retryable } };
}

export const MOBILE_PAGINATION_CONTRACT = {
  version: "mobile-pagination-v1",
  shape: {
    items: "array",
    nextCursor: "string|null",
    hasMore: "boolean",
  },
} as const;

export type MobilePaginationPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function emptyMobilePage<T>(): MobilePaginationPage<T> {
  return { items: [], nextCursor: null, hasMore: false };
}
