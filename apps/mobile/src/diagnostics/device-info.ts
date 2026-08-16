import { Platform, Dimensions } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

import { getMobileBuildInfo } from "../config/build-info";
import type { DiagnosticsAppInfo, DiagnosticsDeviceInfo } from "../../../../lib/mobile/diagnostics/types";

export function collectAppInfo(): DiagnosticsAppInfo {
  const build = getMobileBuildInfo();
  return {
    version: build.versionName,
    versionCode: build.versionCode,
    commit: build.commit,
    environment: build.environment,
    packageName: build.packageName ?? Constants.expoConfig?.android?.package ?? "ru.lot.marketplace.alpha",
    buildDate: build.buildDate,
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
