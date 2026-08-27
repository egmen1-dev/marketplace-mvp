export type { UpdateErrorClass as UpdateFlowError } from "../../../../lib/mobile/update-journey/error-taxonomy";
export { UPDATE_ERROR_MESSAGES } from "../../../../lib/mobile/update-journey/error-taxonomy";

export type MobileUpdateState =
  | "NO_UPDATE"
  | "OPTIONAL_UPDATE"
  | "RECOMMENDED_UPDATE"
  | "REQUIRED_UPDATE"
  | "UNSUPPORTED_CLIENT";

export const UPDATE_DEFER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const UPDATE_ANALYTICS = {
  available: "update_available",
  viewed: "update_viewed",
  started: "update_started",
  deferred: "update_deferred",
  downloaded: "update_downloaded",
  installOpened: "update_install_opened",
  failed: "update_failed",
} as const;
