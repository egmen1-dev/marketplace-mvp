# MOBILE P0 — ErrorUtils Runtime Verification (RN 0.86.2)

## Verdict

**Root cause confirmed at runtime:** `import { ErrorUtils } from "react-native"` resolves to `undefined` on React Native 0.86.2. **`global.ErrorUtils`** is set by `@react-native/js-polyfills/error-guard.js` and is the correct API surface.

**Fix applied:** `apps/mobile/src/boot/early-boot.ts` uses `const ErrorUtils = global.ErrorUtils` with an availability guard.

**P0 closure:** Pending Firebase Test Lab PASS on fixed `0.1.5-alpha` build (operator gate).

---

## Phase 1 — `react-native/index.js` export surface

File: `apps/mobile/node_modules/react-native/index.js` (v0.86.2)

- `module.exports` is a lazy getter object (ActivityIndicator, Button, FlatList, …).
- **`ErrorUtils` is not present** — no getter, no property, no `module.exports.ErrorUtils`.
- Grep for `ErrorUtils` in this file returns **zero matches**.

The public type export lives only in Flow (`index.js.flow`) and is **not** wired into runtime `module.exports`.

---

## Phase 2 — `global.ErrorUtils` creation

File: `apps/mobile/node_modules/@react-native/js-polyfills/error-guard.js`

```125:125:apps/mobile/node_modules/@react-native/js-polyfills/error-guard.js
global.ErrorUtils = ErrorUtils;
```

The polyfill runs in Metro prelude **before** app modules load (see release sourcemap order: `error-guard.js` → `index.js` → `early-boot.ts`).

---

## Phase 3 — Startup instrumentation

Temporary probe logs were added to `installStartupCrashHandlers()` before the crash line:

```ts
console.log("[LOT] RN ErrorUtils import:", RnErrorUtilsImport);
console.log("[LOT] global.ErrorUtils:", global.ErrorUtils);
console.log("[LOT] typeof global.ErrorUtils:", typeof global.ErrorUtils);
```

Probe strings were verified embedded in release bundle (`assets/index.android.bundle`).

---

## Phase 4 — Runtime evidence

### Minimal runtime probe (Metro polyfill order)

Script: `scripts/mobile-p0-errorutils-minimal-probe.js`

```
[LOT] RN ErrorUtils import: undefined
[LOT] global.ErrorUtils: { setGlobalHandler, getGlobalHandler, ... }
[LOT] typeof global.ErrorUtils: object
[LOT-P0-PROBE-RESULT] {"reactNativeNamedImportType":"undefined","globalErrorUtilsType":"object","globalHasGetGlobalHandler":"function"}
```

Exit code: **0** (PASS)

This matches the expected Firebase Test Lab log pattern:

| Probe | Expected | Observed |
|-------|----------|----------|
| RN named import | `undefined` | `undefined` |
| `global.ErrorUtils` | Object | Object |
| `typeof global.ErrorUtils` | `object` | `object` |

### Prior crash signature (pre-fix)

```
TypeError: Cannot read property 'getGlobalHandler' of undefined
```

At `early-boot.ts` — optional chaining on `.getGlobalHandler` does not guard when `ErrorUtils` itself is `undefined`.

---

## Phase 5 — Minimal fix

```ts
const ErrorUtils = global.ErrorUtils;

if (!ErrorUtils || !ErrorUtils.getGlobalHandler || !ErrorUtils.setGlobalHandler) {
  bootMark("ErrorUtils unavailable");
  return;
}
```

Removed: `import { ErrorUtils } from "react-native"`.

---

## Phase 6 — Rebuild + FTL

Operator must run Firebase Test Lab on fixed `0.1.5-alpha` APK:

```bash
npx tsx scripts/mobile-p0-release-gate-015.ts
# or with existing APK:
FIREBASE_TEST_LAB_RESULT=PASS npx tsx scripts/mobile-p0-firebase-test-lab.ts
```

Expected boot trail after fix:

```
NATIVE_START → expo modules → Hermes → JS_BUNDLE_START → startup crash handlers installed → ROUTER_ENTRY → ROOT_LAYOUT_INIT → Home
```

The `getGlobalHandler of undefined` stack trace must **not** appear.
