import type { MobileReleaseChannelId } from "@prisma/client";

/** EPIC 83 — first supported Closed Alpha baseline (0.1.2-alpha / versionCode 3). */
export const CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE = 3;
export const CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME = "0.1.2-alpha";

/** Closed Beta RC1.1+ baseline (0.1.6-beta.2 / versionCode 5). */
export const CLOSED_BETA_MINIMUM_SUPPORTED_VERSION_CODE = 5;
export const CLOSED_BETA_MINIMUM_SUPPORTED_VERSION_NAME = "0.1.6-beta.2";
export const CLOSED_ALPHA_UNSUPPORTED_CLIENT_REASON = "CLIENT_TOO_OLD" as const;

export type MinimumSupportedVersion = {
  versionCode: number;
  versionName: string;
  reason: typeof CLOSED_ALPHA_UNSUPPORTED_CLIENT_REASON;
};

const CHANNEL_MINIMUMS: Partial<Record<MobileReleaseChannelId, MinimumSupportedVersion>> = {
  CLOSED_ALPHA: {
    versionCode: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE,
    versionName: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME,
    reason: CLOSED_ALPHA_UNSUPPORTED_CLIENT_REASON,
  },
  BETA: {
    versionCode: CLOSED_BETA_MINIMUM_SUPPORTED_VERSION_CODE,
    versionName: CLOSED_BETA_MINIMUM_SUPPORTED_VERSION_NAME,
    reason: CLOSED_ALPHA_UNSUPPORTED_CLIENT_REASON,
  },
};

export function getMinimumSupportedVersion(
  channel: MobileReleaseChannelId = "CLOSED_ALPHA",
): MinimumSupportedVersion | null {
  return CHANNEL_MINIMUMS[channel] ?? null;
}

export function isClientBelowMinimumSupported(
  clientVersionCode: number,
  channel: MobileReleaseChannelId = "CLOSED_ALPHA",
): boolean {
  const minimum = getMinimumSupportedVersion(channel);
  if (!minimum) return false;
  return clientVersionCode < minimum.versionCode;
}
