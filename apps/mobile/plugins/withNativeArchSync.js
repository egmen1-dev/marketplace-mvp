const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Ensures android/gradle.properties newArchEnabled matches expo.newArchEnabled.
 * P0 forensics: 0.1.4 shipped with app.json newArchEnabled=false but gradle newArchEnabled=true,
 * leaving BuildConfig.IS_NEW_ARCHITECTURE_ENABLED=true in release APK.
 */
function withNativeArchSync(config) {
  const enabled = config.newArchEnabled === true;
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;
    const key = "newArchEnabled";
    const value = enabled ? "true" : "false";
    const idx = props.findIndex((p) => p.type === "property" && p.key === key);
    if (idx >= 0) {
      props[idx].value = value;
    } else {
      props.push({ type: "property", key, value });
    }
    return mod;
  });
}

module.exports = withNativeArchSync;
