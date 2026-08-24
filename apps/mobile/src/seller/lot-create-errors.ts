import { LOT_CREATE_COPY } from "./lot-create-copy";

export type LotCreateErrorContext = "upload" | "publish" | "save" | "pickup";

const TECHNICAL_PATTERNS = [
  /formdatapart/i,
  /unsupported.*implementation/i,
  /typeerror/i,
  /undefined is not/i,
  /cannot read propert/i,
  /json parse/i,
  /network request failed/i,
  /fetch failed/i,
  /aborterror/i,
  /internal server error/i,
  /unexpected token/i,
];

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

function isTechnicalMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function formatLotCreateError(
  err: unknown,
  context: LotCreateErrorContext = "publish",
): { message: string; detail: string | null; canRetry: boolean } {
  const raw = rawMessage(err);
  const lower = raw.toLowerCase();

  if (isTechnicalMessage(raw)) {
    if (context === "upload") {
      return {
        message: LOT_CREATE_COPY.uploadErrorTitle,
        detail: LOT_CREATE_COPY.uploadErrorBody,
        canRetry: true,
      };
    }
    if (context === "pickup") {
      return {
        message: LOT_CREATE_COPY.pickupLoadError,
        detail: null,
        canRetry: true,
      };
    }
    return {
      message: LOT_CREATE_COPY.publishError,
      detail: null,
      canRetry: true,
    };
  }

  if (lower.includes("фото") || lower.includes("upload") || lower.includes("image")) {
    return {
      message: LOT_CREATE_COPY.uploadErrorTitle,
      detail: LOT_CREATE_COPY.uploadErrorBody,
      canRetry: true,
    };
  }

  if (lower.includes("самовывоз") || lower.includes("точк") || lower.includes("pickup")) {
    return {
      message: LOT_CREATE_COPY.pickupSaveError,
      detail: null,
      canRetry: true,
    };
  }

  if (lower.includes("network") || lower.includes("fetch") || lower.includes("сеть") || lower.includes("интернет")) {
    return {
      message: LOT_CREATE_COPY.networkError,
      detail: null,
      canRetry: true,
    };
  }

  return {
    message: raw || LOT_CREATE_COPY.publishError,
    detail: null,
    canRetry: context !== "save",
  };
}
