import { getBetaEnvironment } from "./environment";

export type BuildInfo = {
  appVersion: string;
  buildNumber: number;
  channel: string;
  platform: string;
  buildTime: string;
  commitSha: string;
};

export function getBuildInfo(): BuildInfo {
  const env = getBetaEnvironment();
  return {
    appVersion: env.appVersion,
    buildNumber: env.buildNumber,
    channel: env.channel,
    platform: env.platform,
    buildTime: process.env.EXPO_PUBLIC_BUILD_TIME ?? "unknown",
    commitSha: process.env.EXPO_PUBLIC_COMMIT_SHA ?? "unknown",
  };
}
