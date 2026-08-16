import * as Device from "expo-device";
import { Platform } from "react-native";

import { loadAppConfig } from "../config/env";

export function buildErrorReport(screen: string) {
  const config = loadAppConfig();
  return {
    errorId: `alpha-${Date.now()}`,
    appVersion: config.appVersion,
    buildNumber: config.buildNumber,
    releaseChannel: config.releaseChannel,
    platform: Platform.OS,
    model: Device.modelName ?? "unknown",
    screen,
    apiVersion: "mobile-v1",
  };
}
