import { Platform, Dimensions } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

import { loadAppConfig } from "../config/env";
import type { DiagnosticsAppInfo, DiagnosticsDeviceInfo } from "../../../../lib/mobile/diagnostics/types";

export function collectAppInfo(): DiagnosticsAppInfo {
  const config = loadAppConfig();
  return {
    version: config.appVersion,
    versionCode: Number(config.buildNumber) || 1,
    commit: process.env.EXPO_PUBLIC_GIT_COMMIT ?? "unknown",
    environment: config.releaseChannel,
    packageName: Constants.expoConfig?.android?.package ?? "ru.lot.marketplace.alpha",
    buildDate: process.env.EXPO_PUBLIC_BUILD_TIME ?? undefined,
  };
}

export function collectDeviceInfo(): DiagnosticsDeviceInfo {
  const { width, height } = Dimensions.get("window");
  return {
    manufacturer: Device.manufacturer ?? "unknown",
    model: Device.modelName ?? Device.deviceName ?? "unknown",
    androidVersion: String(Platform.Version),
    sdk: typeof Platform.Version === "number" ? Platform.Version : 0,
    locale: Intl.DateTimeFormat().resolvedOptions().locale || "ru-RU",
    screen: `${Math.round(width)}x${Math.round(height)}`,
  };
}
