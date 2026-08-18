/**
 * Custom Expo entry — logs BOOT steps before expo-router bootstraps React.
 * Import failures register a minimal fatal UI instead of closing the app.
 */
const { bootMark, bootStage, recordFatalStartupError } = require("./src/boot/early-boot");

bootMark("index.js entry start");

try {
  bootStage("ROUTER_ENTRY");
  bootMark("loading expo-router/entry");
  require("expo-router/entry");
  bootMark("expo-router/entry loaded");
} catch (error) {
  recordFatalStartupError(error, "entry");
  bootMark("registering fatal bootstrap fallback");
  const { registerFatalBootstrap } = require("./src/boot/fatal-bootstrap");
  registerFatalBootstrap();
}
