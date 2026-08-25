const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

/**
 * Enables in-app APK update install handoff on Android.
 * - REQUEST_INSTALL_PACKAGES for package installer
 * - package-archive VIEW query for Android 11+
 */
function withAndroidApkInstaller(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    AndroidConfig.Manifest.ensureToolsAvailable(manifest);

    if (!manifest.manifest["uses-permission"]) {
      manifest.manifest["uses-permission"] = [];
    }
    const permissions = manifest.manifest["uses-permission"];
    const installPerm = "android.permission.REQUEST_INSTALL_PACKAGES";
    if (!permissions.some((p) => p.$["android:name"] === installPerm)) {
      permissions.push({ $: { "android:name": installPerm } });
    }

    const mainApp = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    if (!mainApp.queries) {
      mainApp.queries = [{ intent: [] }];
    }
    const queries = Array.isArray(mainApp.queries) ? mainApp.queries[0] : mainApp.queries;
    if (!queries.intent) queries.intent = [];
    const intents = queries.intent;
    const hasApkView = intents.some(
      (item) =>
        item.action?.some((a) => a.$["android:name"] === "android.intent.action.VIEW") &&
        item.data?.some((d) => d.$["android:mimeType"] === "application/vnd.android.package-archive"),
    );
    if (!hasApkView) {
      intents.push({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:mimeType": "application/vnd.android.package-archive" } }],
      });
    }

    return config;
  });
}

module.exports = withAndroidApkInstaller;
