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
    if (mainApp.queries) {
      delete mainApp.queries;
    }

    if (!manifest.manifest.queries) {
      manifest.manifest.queries = [];
    }
    const manifestQueries = manifest.manifest.queries;
    const apkQuery = {
      intent: [
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          data: [{ $: { "android:mimeType": "application/vnd.android.package-archive" } }],
        },
      ],
    };
    const hasApkView = manifestQueries.some((query) =>
      query.intent?.some(
        (item) =>
          item.action?.some((a) => a.$["android:name"] === "android.intent.action.VIEW") &&
          item.data?.some((d) => d.$["android:mimeType"] === "application/vnd.android.package-archive"),
      ),
    );
    if (!hasApkView) {
      manifestQueries.push(apkQuery);
    }

    return config;
  });
}

module.exports = withAndroidApkInstaller;
