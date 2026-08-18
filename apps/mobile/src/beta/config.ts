import type { BetaEnvironment } from "./environment";
import { getBetaEnvironment } from "./environment";

export type BetaConfig = {
  betaBannerEnabled: boolean;
  betaBannerText: string;
  buildExpiresAt: string | null;
  buildExpired: boolean;
  feedbackCenterEnabled: boolean;
  sessionRecorderEnabled: boolean;
  crashReportingEnabled: boolean;
  performanceTrackingEnabled: boolean;
  remoteConfig: Record<string, unknown>;
  flags: Record<string, boolean>;
};

let config: BetaConfig = {
  betaBannerEnabled: true,
  betaBannerText: "Closed Beta",
  buildExpiresAt: null,
  buildExpired: false,
  feedbackCenterEnabled: true,
  sessionRecorderEnabled: true,
  crashReportingEnabled: true,
  performanceTrackingEnabled: true,
  remoteConfig: {},
  flags: {},
};

export function getBetaConfig(): BetaConfig {
  return config;
}

export function applyBetaConfig(
  remoteConfig: Record<string, unknown> | null,
  flags: Record<string, boolean> = {},
): BetaConfig {
  const env = getBetaEnvironment();
  const expiresAt = typeof remoteConfig?.buildExpiresAt === "string" ? remoteConfig.buildExpiresAt : null;
  const buildExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  config = {
    betaBannerEnabled: remoteConfig?.betaBannerEnabled !== false && env.isBeta,
    betaBannerText: String(remoteConfig?.betaBannerText ?? "Closed Beta"),
    buildExpiresAt: expiresAt,
    buildExpired,
    feedbackCenterEnabled: remoteConfig?.feedbackCenterEnabled !== false,
    sessionRecorderEnabled: remoteConfig?.sessionRecorderEnabled !== false,
    crashReportingEnabled: remoteConfig?.crashReportingEnabled !== false,
    performanceTrackingEnabled: remoteConfig?.performanceTrackingEnabled !== false,
    remoteConfig: remoteConfig ?? {},
    flags,
  };
  return config;
}

export function isBuildExpired(): boolean {
  return getBetaConfig().buildExpired;
}
