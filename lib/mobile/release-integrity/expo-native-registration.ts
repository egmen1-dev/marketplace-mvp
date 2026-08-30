/** Pre-release Expo native module registration integrity checks. */

export type ExpoNativeModuleSpec = {
  packageName: string;
  /** Native class/module markers expected in APK dex when package is declared. */
  nativeMarkers: string[];
  /** JS bundle markers indicating runtime dependency on the package. */
  bundleMarkers: string[];
};

/** Production Expo packages that require native registration in release APKs. */
export const PRODUCTION_EXPO_NATIVE_MODULES: ExpoNativeModuleSpec[] = [
  {
    packageName: "expo-clipboard",
    nativeMarkers: ["ExpoClipboardModule", "expo.modules.clipboard.ClipboardModule"],
    bundleMarkers: ["expo-clipboard", "expo/modules/clipboard"],
  },
  {
    packageName: "expo-file-system",
    nativeMarkers: ["expo.modules.filesystem", "FileSystemModule"],
    bundleMarkers: ["expo-file-system", "expo/modules/filesystem"],
  },
  {
    packageName: "expo-secure-store",
    nativeMarkers: ["expo.modules.securestore", "SecureStoreModule"],
    bundleMarkers: ["expo-secure-store", "expo/modules/securestore"],
  },
  {
    packageName: "expo-intent-launcher",
    nativeMarkers: ["expo.modules.intentlauncher", "IntentLauncherModule"],
    bundleMarkers: ["expo-intent-launcher", "expo/modules/intentlauncher"],
  },
];

export type DexScanResult = {
  dexFiles: string[];
  markersFound: Record<string, boolean>;
};

export type ExpoNativeRegistrationVerdict = {
  ok: boolean;
  declaredPackages: string[];
  failures: string[];
  clipboardRegression: {
    bundleReferencesClipboard: boolean;
    nativeClipboardRegistered: boolean;
    wouldFailCode24Code25: boolean;
  };
};

function markerPresent(haystack: string, marker: string): boolean {
  return haystack.includes(marker);
}

export function evaluateExpoNativeRegistration(input: {
  declaredDependencies: Record<string, string>;
  dexContent: string;
  bundleContent: string;
  specs?: ExpoNativeModuleSpec[];
}): ExpoNativeRegistrationVerdict {
  const specs = input.specs ?? PRODUCTION_EXPO_NATIVE_MODULES;
  const failures: string[] = [];
  const declaredPackages = specs
    .map((spec) => spec.packageName)
    .filter((name) => Boolean(input.declaredDependencies[name]));

  for (const spec of specs) {
    if (!input.declaredDependencies[spec.packageName]) continue;
    const hasNative = spec.nativeMarkers.some((marker) => markerPresent(input.dexContent, marker));
    if (!hasNative) {
      failures.push(
        `declared dependency ${spec.packageName} missing native registration (${spec.nativeMarkers.join(" | ")})`,
      );
    }
  }

  for (const spec of specs) {
    const bundleUses = spec.bundleMarkers.some((marker) => markerPresent(input.bundleContent, marker));
    if (!bundleUses) continue;
    const hasNative = spec.nativeMarkers.some((marker) => markerPresent(input.dexContent, marker));
    if (!hasNative) {
      failures.push(
        `bundle references ${spec.packageName} but native module is not registered (${spec.nativeMarkers.join(" | ")})`,
      );
    }
  }

  const clipboardSpec = specs.find((spec) => spec.packageName === "expo-clipboard")!;
  const bundleReferencesClipboard = clipboardSpec.bundleMarkers.some((marker) =>
    markerPresent(input.bundleContent, marker),
  );
  const nativeClipboardRegistered = clipboardSpec.nativeMarkers.some((marker) =>
    markerPresent(input.dexContent, marker),
  );
  const wouldFailCode24Code25 = bundleReferencesClipboard && !nativeClipboardRegistered;

  if (wouldFailCode24Code25) {
    failures.push("CODE24_CODE25_CLIPBOARD_CLASS_FAILURE: JS requires ExpoClipboard but native module absent");
  }

  return {
    ok: failures.length === 0,
    declaredPackages,
    failures,
    clipboardRegression: {
      bundleReferencesClipboard,
      nativeClipboardRegistered,
      wouldFailCode24Code25,
    },
  };
}
