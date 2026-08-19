import { loadAppConfig } from "../config/env";
import { getBetaEnvironment } from "./environment";

export type BuildInfo = {
  appVersion: string;
  buildNumber: number;
  channel: string;
  releaseChannel: string;
  platform: string;
  buildTime: string;
  commitSha: string;
  apiBaseUrl: string;
  environment: string;
};

export function getBuildInfo(): BuildInfo {
  const env = getBetaEnvironment();
  const config = loadAppConfig();
  return {
    appVersion: env.appVersion,
    buildNumber: env.buildNumber,
    channel: env.channel,
    releaseChannel: config.releaseChannel,
    platform: env.platform,
    buildTime: process.env.EXPO_PUBLIC_BUILD_TIME ?? "unknown",
    commitSha: process.env.EXPO_PUBLIC_COMMIT_SHA ?? "unknown",
    apiBaseUrl: env.apiBaseUrl,
    environment: config.releaseChannel,
  };
}
