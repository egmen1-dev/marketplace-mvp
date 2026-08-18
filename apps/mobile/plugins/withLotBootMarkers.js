const { withMainApplication } = require("@expo/config-plugins");

/** Emits NATIVE_START to logcat for physical cold-start tracing. */
function withLotBootMarkers(config) {
  return withMainApplication(config, (mod) => {
    const marker = 'android.util.Log.i("LOT", "NATIVE_START: MainApplication.onCreate")';
    if (!mod.modResults.contents.includes("NATIVE_START")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /super\.onCreate\(\)/,
        `${marker}\n    super.onCreate()`,
      );
      if (!mod.modResults.contents.includes("android.util.Log")) {
        mod.modResults.contents = mod.modResults.contents.replace(
          "import android.app.Application",
          "import android.app.Application\nimport android.util.Log",
        );
      }
    }
    return mod;
  });
}

module.exports = withLotBootMarkers;
