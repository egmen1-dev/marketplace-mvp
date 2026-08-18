import * as Device from "expo-device";
import { Platform } from "react-native";

import { loadAppConfig } from "../config/env";
import { getDeviceId } from "../storage/secure-session";
import { getSessionId } from "../telemetry/session";

export type BetaChannel = "CLOSED_ALPHA" | "CLOSED_BETA" | "OPEN_BETA" | "RC" | "PRODUCTION";

export type BetaEnvironment = {
  channel: BetaChannel;
  appVersion: string;
  buildNumber: number;
  platform: string;
  deviceModel: string;
  deviceId: string;
  sessionId: string;
  apiBaseUrl: string;
  environmentLabel: string;
  isBeta: boolean;
};

let cached: BetaEnvironment | null = null;

export function getBetaEnvironment(): BetaEnvironment {
  if (cached) return cached;
  const config = loadAppConfig();
  const channel = (process.env.EXPO_PUBLIC_BETA_CHANNEL ?? "CLOSED_BETA") as BetaChannel;
  cached = {
    channel,
    appVersion: config.appVersion,
    buildNumber: Number(config.buildNumber) || 1,
    platform: Platform.OS,
    deviceModel: Device.modelName ?? "unknown",
    deviceId: getDeviceId(),
    sessionId: getSessionId(),
    apiBaseUrl: config.apiBaseUrl,
    environmentLabel: channel === "CLOSED_BETA" || channel === "CLOSED_ALPHA" ? "BETA" : "PRODUCTION",
    isBeta: channel !== "PRODUCTION" && channel !== "RC",
  };
  return cached;
}

export function refreshBetaSession(): void {
  cached = null;
}
