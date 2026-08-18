export type ReleaseChannel = "development" | "staging" | "production";

export type AppConfig = {
  apiBaseUrl: string;
  releaseChannel: ReleaseChannel;
  appVersion: string;
  buildNumber: string;
};

const STAGING_URL = "https://web-production-e56fb.up.railway.app";
const DEV_URL = "http://10.0.2.2:3000";

export function loadAppConfig(): AppConfig {
  const channel = (process.env.EXPO_PUBLIC_RELEASE_CHANNEL ?? "staging") as ReleaseChannel;
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (channel === "development" ? DEV_URL : channel === "production" ? STAGING_URL : STAGING_URL);

  return {
    apiBaseUrl,
    releaseChannel: channel,
    appVersion: "0.1.4-alpha",
    buildNumber: "5",
  };
}
