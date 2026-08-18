/**
 * Minimal runtime probe bundle — prelude + error-guard + probe module only.
 * Mirrors Metro module order without loading react-native native surface.
 */
/* eslint-disable no-undef */
var __BUNDLE_START_TIME__ = globalThis.nativePerformanceNow
  ? nativePerformanceNow()
  : Date.now();
var __DEV__ = false;
var process = globalThis.process || {};
var __METRO_GLOBAL_PREFIX__ = "";

(function (global) {
  var _inGuard = 0;
  var _globalHandler =
    global.RN$useAlwaysAvailableJSErrorHandling === true
      ? global.RN$handleException
      : function (e, isFatal) {
          throw e;
        };
  var ErrorUtils = {
    setGlobalHandler: function (fun) {
      _globalHandler = fun;
    },
    getGlobalHandler: function () {
      return _globalHandler;
    },
    reportError: function (error) {
      _globalHandler && _globalHandler(error, false);
    },
    reportFatalError: function (error) {
      _globalHandler && _globalHandler(error, true);
    },
    applyWithGuard: function (fun, context, args) {
      try {
        _inGuard++;
        return fun.apply(context, args);
      } catch (e) {
        ErrorUtils.reportError(e);
      } finally {
        _inGuard--;
      }
      return null;
    },
    applyWithGuardIfNeeded: function (fun, context, args) {
      if (ErrorUtils.inGuard()) {
        return fun.apply(context, args);
      }
      ErrorUtils.applyWithGuard(fun, context, args);
      return null;
    },
    inGuard: function () {
      return !!_inGuard;
    },
    guard: function (fun, name, context) {
      if (typeof fun !== "function") {
        console.warn("A function must be passed to ErrorUtils.guard, got ", fun);
        return null;
      }
      var guardName = name ?? fun.name ?? "<generated guard>";
      return function (...args) {
        return ErrorUtils.applyWithGuard(fun, context ?? this, args, null, guardName);
      };
    },
  };
  global.ErrorUtils = ErrorUtils;
})(typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : this);

// Metro-style react-native export surface (RN 0.86.2 — no ErrorUtils getter)
var reactNativeModule = {
  get ActivityIndicator() {
    throw new Error("not used in probe");
  },
};

var namedImport = reactNativeModule.ErrorUtils;

var result = {
  reactNativeNamedImport: namedImport,
  reactNativeNamedImportType: typeof namedImport,
  globalErrorUtils: global.ErrorUtils,
  globalErrorUtilsType: typeof global.ErrorUtils,
  globalHasGetGlobalHandler: typeof global.ErrorUtils?.getGlobalHandler,
};

console.log("[LOT] RN ErrorUtils import:", namedImport);
console.log("[LOT] global.ErrorUtils:", global.ErrorUtils);
console.log("[LOT] typeof global.ErrorUtils:", typeof global.ErrorUtils);
console.log("[LOT-P0-PROBE-RESULT]", JSON.stringify(result));

const pass =
  namedImport === undefined &&
  typeof global.ErrorUtils === "object" &&
  typeof global.ErrorUtils?.getGlobalHandler === "function";

if (!pass) {
  process.exitCode = 1;
}
