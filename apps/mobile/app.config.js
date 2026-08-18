/**
 * Expo config — P0 hotfix: lazy route imports + stable release arch.
 *
 * ROOT CAUSE FIX: default expo-router `sync` import mode eagerly requires all
 * route modules (and their native deps) before the boot pipeline runs.
 * `EXPO_ROUTER_IMPORT_MODE=lazy` limits cold-start to the active route tree.
 */
process.env.EXPO_ROUTER_IMPORT_MODE = process.env.EXPO_ROUTER_IMPORT_MODE ?? "lazy";

const appJson = require("./app.json");

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    version: "0.1.5-alpha",
    newArchEnabled: false,
    android: {
      ...appJson.expo.android,
      versionCode: 6,
    },
  },
};
