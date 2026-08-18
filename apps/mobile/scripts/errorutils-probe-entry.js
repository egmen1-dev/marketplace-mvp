/**
 * Minimal P0 probe — only touches react-native.ErrorUtils (no component imports).
 */
require("@react-native/js-polyfills/error-guard");

const reactNativeModule = require("react-native");
const namedImport = reactNativeModule.ErrorUtils;

const result = {
  reactNativeNamedImport: namedImport,
  reactNativeNamedImportType: typeof namedImport,
  globalErrorUtils: global.ErrorUtils,
  globalErrorUtilsType: typeof global.ErrorUtils,
  globalHasGetGlobalHandler: typeof global.ErrorUtils?.getGlobalHandler,
};

console.log("[LOT-P0-PROBE-RESULT]", JSON.stringify(result));
